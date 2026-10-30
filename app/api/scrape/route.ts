import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { db } from '@/db';
import { products, scrapedContent } from '@/db/schema';
import { getCurrentOrgId } from '@/lib/auth';
import { isValidUuid } from '@/lib/utils/uuid';
import { and, eq, notInArray } from 'drizzle-orm';

const MAX_DEPTH = 2;
const MAX_PAGES = 25;
const MAX_RESPONSE_CHARS = 20000;
const TIMEOUT_MS = 10000;
const USER_AGENT = 'Mozilla/5.0 (Compatible; DispatchBot/1.0)';

type ScrapedPage = {
  url: string;
  title: string;
  content: string;
};

export async function POST(req: Request) {
  try {
    const { url: requestedUrl, productId } = await req.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    const organizationId = await getCurrentOrgId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = productId === 'temp'
      ? null
      : isValidUuid(productId)
        ? await db.query.products.findFirst({
            where: and(
              eq(products.id, productId),
              eq(products.organizationId, organizationId),
            ),
          })
        : null;

    if (productId !== 'temp' && !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const url = product?.website || requestedUrl;
    if (typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'A website URL is required' }, { status: 400 });
    }

    // Normalize root
    let rootUrl: URL;
    try {
      rootUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const origin = rootUrl.origin;
    const visited = new Set<string>();
    const queue: { url: string; depth: number }[] = [
      { url: rootUrl.toString(), depth: 0 },
    ];
    const pages: ScrapedPage[] = [];

    const limit = pLimit(5); // concurrency

    while (queue.length > 0 && pages.length < MAX_PAGES) {
      const batch = queue.splice(0, 5);

      const results = await Promise.all(
        batch.map((item) =>
          limit(async () => {
            if (visited.has(item.url)) return null;
            visited.add(item.url);

            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

              const res = await fetch(item.url, {
                redirect: 'follow',
                signal: controller.signal,
                headers: { 'User-Agent': USER_AGENT },
              });

              clearTimeout(timeout);

              const contentType = res.headers.get('content-type') || '';
              if (!res.ok || !contentType.includes('text/html')) return null;

              const html = await res.text();
              const $ = cheerio.load(html);

              // Strip boilerplate
              $('script, style, nav, footer, header, noscript, iframe, svg').remove();

              // Collect internal links for next depth
              if (item.depth < MAX_DEPTH) {
                $('a[href]').each((_, el) => {
                  const href = $(el).attr('href');
                  if (!href) return;
                  try {
                    const abs = new URL(href, item.url).toString().split('#')[0];
                    const parsed = new URL(abs);
                    if (
                      parsed.origin === origin &&
                      !visited.has(abs) &&
                      !queue.some((q) => q.url === abs)
                    ) {
                      queue.push({ url: abs, depth: item.depth + 1 });
                    }
                  } catch {}
                });
              }

              const title = $('title').text().trim() || 'Untitled';
              const content = $('body')
                .text()
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => l.length > 20) // filter short UI noise
                .join('\n');

              return { url: item.url, title, content };
            } catch (err) {
              console.error(`Scrape failed: ${item.url}`, err);
              return null;
            }
          })
        )
      );

      for (const r of results) {
        if (r) pages.push(r);
      }
    }

    let remainingChars = MAX_RESPONSE_CHARS;
    const pagesWithContent = pages.flatMap((page) => {
      if (remainingChars <= 0) return [];

      const content = page.content.slice(0, remainingChars);
      remainingChars -= content.length;
      return content.trim() ? [{ ...page, content }] : [];
    });

    if (pagesWithContent.length === 0) {
      return NextResponse.json(
        { error: 'No readable website text was found.' },
        { status: 422 },
      );
    }

    if (product) {
      const insertedPages = await db
        .insert(scrapedContent)
        .values(pagesWithContent.map((page) => ({
          productId: product.id,
          url: page.url,
          title: page.title,
          content: page.content,
        })))
        .returning({ id: scrapedContent.id });

      await db
        .delete(scrapedContent)
        .where(and(
          eq(scrapedContent.productId, product.id),
          notInArray(scrapedContent.id, insertedPages.map((page) => page.id)),
        ));

      await db
        .update(products)
        .set({ lastScrapedAt: new Date(), scrapedRootUrl: origin })
        .where(eq(products.id, product.id));
    }

    return NextResponse.json({
      success: true,
      pagesCrawled: pages.length,
      pages: pagesWithContent,
      totalChars: MAX_RESPONSE_CHARS - remainingChars,
      rootUrl: origin,
    });
  } catch (err: any) {
    console.error('Scrape error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}