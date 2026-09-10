import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { db } from '@/db';
import { scrapedContent, products } from '@/db/schema';
import { eq } from 'drizzle-orm';

const MAX_DEPTH = 2;
const MAX_PAGES = 25;
const TIMEOUT_MS = 10000;
const USER_AGENT = 'Mozilla/5.0 (Compatible; DispatchBot/1.0)';

type ScrapedPage = {
  url: string;
  title: string;
  content: string;
};

export async function POST(req: Request) {
  try {
    const { url, productId } = await req.json();

    if (!url || !productId) {
      return NextResponse.json(
        { error: 'url and productId are required' },
        { status: 400 }
      );
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

    // Store in DB (delete old, insert new)
    // await db.delete(scrapedContent).where(eq(scrapedContent.productId, productId));

    // if (pages.length > 0) {
    //   await db.insert(scrapedContent).values(
    //     pages.map((p) => ({
    //       productId,
    //       url: p.url,
    //       title: p.title,
    //       content: p.content,
    //     }))
    //   );
    // }

    // // Update product timestamp
    // await db
    //   .update(products)
    //   .set({ lastScrapedAt: new Date(), scrapedRootUrl: origin })
    //   .where(eq(products.id, productId));

    return NextResponse.json({
      success: true,
      pagesCrawled: pages.length,
      pages: pages.map((p) => ({ url: p.url, title: p.title })),
      // totalChars: pages.reduce((sum, p) => sum + p.content.length, 0),
      rootUrl: origin,
    });
  } catch (err: any) {
    console.error('Scrape error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}