import {NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import 'dotenv/config'; // Ensure environment variables are loaded
import { GoogleGenAI } from '@google/genai';
import { batches, posts, scrapedContent, products, organizations } from '@/db/schema';
import { db } from '@/db';
import crypto from 'crypto';
import { getWeekKey, getDefaultOffset } from '@/lib/date-utils';

import { eq, and } from 'drizzle-orm';
import { getCurrentUserId, getCurrentOrgId } from '@/lib/auth';
import { buildContentPrompt } from '@/lib/prompts/buildContentPrompt';
import { contentResponseSchema } from '@/lib/prompts/contentSchema';
import { calculateGlobalPostSchedule } from '@/lib/date-utils';
import { isValidUuid } from '@/lib/utils/uuid';

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Update your interface to match your strict schema parameters
interface GeneratedPost {
  day: "mon" | "tue" | "wed" | "thu" | "fri"; // 🎯 Change from string to this
  time: string;
  category: string;
  platform: string;
  content: string;
  hook?: string;
}

export async function POST(req: Request) {
  try {
    
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional: Allow overriding weeks/days via request body in the future
    // For now, defaults to the 5-day / 3-5 posts per day spec
    // const body = await req.json().catch(() => ({}));
    // const weeksToGenerate = body.weeks ?? 1;

    const { productId, force } = await req.json();
    

    if (!productId ) {
      return NextResponse.json({ error: 'productId  required' }, { status: 400 });
    }
    if (!isValidUuid(productId)) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
    }
    console.log(`Generating content for productId: ${productId} by userId: ${userId}`);

    // 1. Fetch product
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    console.log(`Product found: ${product.name} (${product.id})`);

    const orgId = await getCurrentOrgId();
    const [orgRow] = await db
      .select({ timezone: organizations.timezone }) // Use standard drizzle selection syntax
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const userTimeZone = orgRow?.timezone || 'UTC';


    // 2. Fetch scraped content
    const scraped = await db
      .select()
      .from(scrapedContent)
      .where(eq(scrapedContent.productId, productId));

    const scrapedContext = scraped
      .map((p) => `# ${p.title}\n${p.content}`)
      .join('\n\n---\n\n')
      .slice(0, 8000);

    // Get current week key (e.g., "2025-W15")
    const weekKey = getWeekKey(getDefaultOffset());
    console.log(`Generating content for week: ${weekKey}`);

    // ── Regen boundaries ──────────────────────────────────────────
    // 1. Week locked: any queued/published posts block regeneration.
    const weekPosts = await db
      .select({ id: posts.id, status: posts.status })
      .from(posts)
      .where(and(eq(posts.productId, productId), eq(posts.weekKey, weekKey)));

    const lockedCount = weekPosts.filter(
      (p) => p.status === 'queued' || p.status === 'published'
    ).length;
    if (lockedCount > 0) {
      return NextResponse.json(
        {
          error: 'This week has queued or published posts and cannot be regenerated.',
          code: 'WEEK_LOCKED',
          lockedCount,
        },
        { status: 409 }
      );
    }

    // 2. Drafts exist: require explicit force, then hard-delete them.
    const draftIds = weekPosts.filter((p) => p.status === 'draft').map((p) => p.id);
    if (draftIds.length > 0 && force !== true) {
      return NextResponse.json(
        {
          error: `${draftIds.length} draft posts already exist for this week.`,
          code: 'DRAFTS_EXIST',
          draftCount: draftIds.length,
        },
        { status: 409 }
      );
    }
    if (draftIds.length > 0 && force === true) {
      await db
        .delete(posts)
        .where(and(eq(posts.productId, productId), eq(posts.weekKey, weekKey), eq(posts.status, 'draft')));
      console.log(`Force regen: deleted ${draftIds.length} existing drafts for ${weekKey}.`);
    }
    
    // Build context with week + website content (for versioning)
    const contextString = `${weekKey}:${product.name}:${scrapedContext}: ${product.description}: ${product.icp}: ${product.tone}: ${product.categories}: ${product.frequencyMin}: ${product.frequencyMax}: ${product.publishTimes}: ${product.platforms}`;

    const contextHash = crypto
      .createHash('sha256')
      .update(contextString)
      .digest('hex');

    const times = product
        ? Array.isArray(product.publishTimes)
          ? product.publishTimes
          : typeof product.publishTimes === 'string'
            ? JSON.parse(product.publishTimes || '[]')
            : []
      : [];
    
    const platforms = product
        ? Array.isArray(product.platforms)
          ? product.platforms
          : typeof product.platforms === 'string'
            ? JSON.parse(product.platforms || '[]')
            : []
      : [];
    
    // ...existing code, after platforms is parsed...
    // ...existing code, after platforms is parsed...
    if (platforms.length === 0) {
      return NextResponse.json(
        {
          error: 'No channels selected for this product. Enable at least one in Settings.',
          code: 'NO_PLATFORMS',
        },
        { status: 400 },
      );
    }

    // 3. Build prompt
    const prompt = buildContentPrompt({
      brandName: product.name,
      description: product.description,
      icp: product.icp,
      tone: product.tone,
      categories: JSON.parse(product.categories || '[]'),
      frequencyMin: product.frequencyMin ?? 1,
      frequencyMax: product.frequencyMax ?? 3,
      publishTimes: times,
      platforms: platforms,
      websiteContext: scrapedContext
    });

    // 4. Call Gemini
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      throw new Error('Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY environment variables.');
    }

    // 2. Initialize the NEW unified GoogleGenAI client
    const ai = new GoogleGenAI({
      vertexai: true,             // CRITICAL: Tells the SDK to use Vertex AI & your $300 billing credits
      project: 'instaroom-501622', // Your GCP Project ID
      location: 'us-central1',
      googleAuthOptions: {
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n')
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: contentResponseSchema
      }
    });

    const text = response.text;  
    if (!text) {
      throw new Error('Vertex AI returned empty content. Check model permissions and quota.');
    }
    
    // 5. Parse and save generated posts
    const genPosts = JSON.parse(text);
    const batchId = uuidv4(); // Unique batch identifier for this generation
    // console.log('Generated posts:', genPosts); // Log the first post for debugging

    const savedPostsData = genPosts
      .map((post: GeneratedPost) => {
        // 1. Compute the timezone-aware target execution date
        const { scheduledAt, weekKey: computedWeekKey } = calculateGlobalPostSchedule(
          post.day, // 'mon'
          post.time, // '11:00'
          userTimeZone
        );

        // 2. 🛡️ THE GUARDRAIL CHECK: Compare the target execution timestamp against the current server time instant
        const isPastSlot = scheduledAt.getTime() <= Date.now();

        if (isPastSlot) {
          console.log(`[Guardrail Log] Skipped generating post for ${post.day} at ${post.time} because it falls in the past.`);
          return null; // Return null so we can filter it out of the insert array
        }

        // Otherwise, it's a valid upcoming slot! Return the database insertion layout object
        return {
          userId,
          productId,
          batchId: batchId,
          scheduledAt,       
          weekKey: computedWeekKey, 
          dayOfWeek: post.day, 
          contextHash: contextHash,
          category: post.category,
          platform: post.platform,
          content: post.content,
          status: 'draft',
          editedContent: null,
          publishedAt: null,
          analytics: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      })
      .filter(Boolean); // 🎯 Cleanly strips out all the 'null' entries from past slots

    // 3. Only create a batch when future slots are available.
    if (savedPostsData.length > 0) {
      await db.insert(batches).values({
        id: batchId,
        userId,
        contextHash,
        weekKey,
        postCount: savedPostsData.length,
        status: 'draft',
      });

      const savedPosts = await db
        .insert(posts)
        .values(savedPostsData)
        .returning();
      
        return NextResponse.json({
          success: true,
          batchId: batchId,
          postCount: savedPosts.length,
          message: `${savedPosts.length} posts staged for review.`
        });
    } else {
      console.log("No new future slots available for generation in this week block.");
      return NextResponse.json(
        { error: 'No future publishing slots are available for the selected week.', code: 'NO_FUTURE_SLOTS' },
        { status: 422 },
      );
    }

  } catch (error) {
    console.error('Content Calendar Generation Failed:', error);

    const message =
      error instanceof Error ? error.message : 'Unknown error during content generation';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


// import { NextRequest, NextResponse } from 'next/server';
// import { v4 as uuidv4 } from 'uuid';
// import fs from 'fs/promises';
// import path from 'path';
// import 'dotenv/config'; // Ensure environment variables are loaded
// import { GoogleGenAI } from '@google/genai';
// import { batches, posts } from '@/db/schema';
// import { db } from '@/db';
// import crypto from 'crypto';

// import { getNextWeekDate, getWeekIdentifier } from '@/lib/date-utils';
// import { eq, and } from 'drizzle-orm';
// import { getCurrentUserId } from '@/lib/auth';


// // Type-safe category enforcement matching your prompt requirements
// const VALID_CATEGORIES = ['design', 'engineering', 'ux', 'marketing', 'launch', 'build'] as const;

// type GeneratedPost = {
//   category: string;
//   platform: string;
//   content: string;
//   day: string;
//   time: string;
// }

// async function loadContextFile(filename: string): Promise<string> {
//   try {
//     const filePath = path.join(process.cwd(), 'data', filename);
//     return await fs.readFile(filePath, 'utf-8');
//   } catch (error) {
//     console.warn(`⚠️ Context file not found or unreadable: ${filename}. Proceeding without it.`);
//     return '';
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
    // const userId = await getCurrentUserId();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // // Optional: Allow overriding weeks/days via request body in the future
    // // For now, defaults to the 5-day / 3-5 posts per day spec
    // const body = await request.json().catch(() => ({}));
    // const weeksToGenerate = body.weeks ?? 1;

//     // 1. Load both master contexts asynchronously from /data directory
//     const [creativeGrayContext, appnomicsContext] = await Promise.all([
//       loadContextFile('creativegray_master.md'),
//       loadContextFile('appnomics_master.md'),
//     ]);

//     if (!appnomicsContext) {
//       return NextResponse.json(
//         { error: 'appnomics_master.md is required but was not found in /data directory.' },
//         { status: 400 }
//       );
//     }

    // // Get current week key (e.g., "2025-W15")
    // const weekKey = getWeekIdentifier(new Date());
    // console.log(`Generating content for week: ${weekKey}`);
    // // return NextResponse.json({
    // //   success: false,
    // //   message: 'Content generation is temporarily disabled for testing. Please enable the generation logic.',
    // // });

    // // Build context with week + website content (for versioning)
    // const contextString = `${weekKey}:${appnomicsContext}`;

    // const contextHash = crypto
    //   .createHash('sha256')
    //   .update(contextString)
    //   .digest('hex');

    // // Check for existing batch
    // // Check if a batch already exists for this week + context
    // const [existingBatch] = await db.select()
    //   .from(posts)
    //   .where(
    //     and(
    //       eq(posts.contextHash, contextHash),
    //       eq(posts.userId, userId),
    //       eq(posts.status, 'draft'),
    //       eq(posts.weekKey, weekKey)
    //     )
    //   )
    //   .limit(1);

    // if (existingBatch) {
    //   return NextResponse.json({
    //     success: false,
    //     message: 'Batch already exists for this week.',
    //     batchId: existingBatch.batchId,
    //   }, { status: 200 }); // ← 200 OK so frontend can handle gracefully

    //     // Option B: Force regenerate by deleting old batch
    //     // await db.delete(posts).where(eq(posts.batchId, existingBatch.batchId));
    //     // Then continue to create new batch
    // }

//     const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
//     const privateKey = process.env.GOOGLE_PRIVATE_KEY;

//     if (!clientEmail || !privateKey) {
//       throw new Error('Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY environment variables.');
//     }

//     // 2. Initialize the NEW unified GoogleGenAI client
//     const ai = new GoogleGenAI({
//       vertexai: true,             // CRITICAL: Tells the SDK to use Vertex AI & your $300 billing credits
//       project: 'instaroom-501622', // Your GCP Project ID
//       location: 'us-central1',
//       googleAuthOptions: {
//         credentials: {
//           client_email: clientEmail,
//           private_key: privateKey.replace(/\\n/g, '\n')
//         }
//       }
//     });

//     // 3. Build the system-enforced prompt
//     const prompt = `You are the autonomous content and growth engine for Appnomics.

//       ### THE FOUNDATION & PAST AUTHORITY: CreativeGray Studio (Reference Data)
//       Use the following scraped background of CreativeGray's 12-year history, case studies (like EZLinks, PlaySquares, etc.), and architectural standards to establish undeniable authority and hard-earned engineering wisdom:
//       ${creativeGrayContext || '[No CreativeGray context available - rely on general senior agency expertise]'}

//       ### THE TARGET PRODUCT / THE FUTURE: Appnomics
//       Use the following scraped details of Appnomics as the primary product being built, marketed, and scaled:
//       ${appnomicsContext}

//       ### EXECUTION REQUIREMENTS:
//       1. **Volume & Cadence:** Generate a detailed, time-based content schedule for a full 5-day week, producing **3 to 5 posts per day**.
//       2. **Category Enforcement:** Every single post must explicitly tag its primary category from this exact array: [${VALID_CATEGORIES.join(', ')}].
//       3. **Platform Targeting:** Each post must specify its target platform (LinkedIn, Twitter/X, Reddit, etc.) and adapt tone/format accordingly.
//       4. **Voice & Tone:** Authoritative founder perspective. Leverages CreativeGray's hard-earned lessons to explain *why* Appnomics exists and how it solves real developer/builder friction. Do not pitch CreativeGray services; pitch Appnomics.
//       5. **The Angle:** "After building 20+ products and scaling software over a decade at CreativeGray, we built Appnomics to..."

//       Output the result in a clean, machine-parsable Markdown schedule complete with timestamps, categories, target platforms, and full post text.`;

//     // 4. Generate content
//     // Add this to your generateContent call
//     const response = await ai.models.generateContent({
//       model: 'gemini-2.5-flash',
//       contents: [{ role: 'user', parts: [{ text: prompt }] }],
//       config: {
//         responseMimeType: "application/json",
//         responseSchema: {
//           type: "ARRAY",
//           items: {
//             type: "OBJECT",
//             properties: {
//               day: { type: "STRING", description: "Monday, Tuesday, etc." },
//               time: { type: "STRING", description: "24-hour format without timezone, e.g. '09:00'" },
//               category: { type: "STRING", enum: [...VALID_CATEGORIES] },
//               platform: { type: "STRING", enum: ["twitter", "linkedin", "reddit"] },
//               content: { type: "STRING", description: "Full post text, platform-native formatting" },
//               hook: { type: "STRING", description: "First line hook for preview cards" }
//             },
//             required: ["day", "time", "category", "platform", "content"]
//           }
//         }
//       }
//     });

    // const text = response.text;
    
    // if (!text) {
    //   throw new Error('Vertex AI returned empty content. Check model permissions and quota.');
    // }


  //   const genPosts = JSON.parse(response.text);
  //   // const post = genPosts[0]; // Sample post for logging
  //   // const dateStr = `${getNextWeekDate(post.day)}T${post.time}`;
  //   // console.log('dateStr sample:', dateStr);
 
  //   const batchId = uuidv4(); // Unique batch identifier for this generation

  //   await db.insert(batches).values({
  //     id: batchId,
  //     userId,
  //     contextHash: contextHash,
  //     weekKey: weekKey, // ✅ now exists
  //     postCount: genPosts.length,
  //     status: 'draft',
  //   });

    
  //   // Inside your API route
  //   const savedPosts = await db.insert(posts).values(
  //     genPosts.map((post: GeneratedPost) => ({
  //       userId,
  //       batchId: batchId,
  //       weekKey: weekKey,
  //       dayOfWeek: post.day, 
  //       contextHash: contextHash,
  //       category: post.category,
  //       platform: post.platform,
  //       content: post.content,
  //       status: 'draft',
  //       scheduledAt: new Date(`${getNextWeekDate(post.day)}T${post.time}`),
  //       day: post.day,
  //       time: post.time,
  //       editedContent: null,
  //       publishedAt: null,
  //       analytics: {},
  //       createdAt: new Date(),
  //       updatedAt: new Date(),
  //     }))
  //   ).returning() as unknown[]; // ← returns saved posts with IDs

  //   return NextResponse.json({
  //     success: true,
  //     batchId: batchId,
  //     postCount: savedPosts.length,
  //     message: `${savedPosts.length} posts staged for review.`
  //   });
  // } catch (error) {
  //   console.error('Content Calendar Generation Failed:', error);

  //   const message =
  //     error instanceof Error ? error.message : 'Unknown error during content generation';

  //   return NextResponse.json(
  //     { error: message },
  //     { status: 500 }
  //   );
  // }
// }


// Helper function to get the next week's date for a given day name
// app/api/generate/route.ts

// export async function POST(request: NextRequest) {
//   const { userId, weekKey } = await request.json();

//   // 1. Get or scrape the latest website content
//   let websiteScrape = await db.query.websiteScrapes.findFirst({
//     where: and(
//       eq(websiteScrapes.userId, userId),
//       eq(websiteScrapes.url, 'https://appnomics.com')
//     ),
//     orderBy: (scrapes, { desc }) => [desc(scrapes.scrapedAt)]
//   });

//   // 2. If no scrape exists OR it's > 7 days old → scrape fresh
//   const isStale = !websiteScrape || 
//     Date.now() - new Date(websiteScrape.scrapedAt).getTime() > 7 * 24 * 60 * 60 * 1000;

//   if (isStale) {
//     const freshContent = await scrapeWebsite('https://appnomics.com');
//     const hash = crypto.createHash('sha256').update(freshContent).digest('hex');
    
//     websiteScrape = await db.insert(websiteScrapes).values({
//       userId,
//       url: 'https://appnomics.com',
//       content: freshContent,
//       hash,
//       scrapedAt: new Date(),
//     }).returning().then(rows => rows[0]);
//   }

//   // 3. Get uploaded docs for this user
//   const userDocs = await db.query.knowledgeBase.findMany({
//     where: eq(knowledgeBase.userId, userId)
//   });

//   // 4. Get user config (from settings)
//   const userConfig = await getUserConfig(userId);

//   // 5. Build the full context fingerprint
//   const contextFingerprint = JSON.stringify({
//     websiteHash: websiteScrape.hash,
//     docHashes: userDocs.map(d => d.hash).sort(),
//     userConfig,
//     weekKey
//   });

//   const contextHash = crypto
//     .createHash('sha256')
//     .update(contextFingerprint)
//     .digest('hex');

//   // 6. Check cache
//   const existingSnapshot = await db.query.contextSnapshots.findFirst({
//     where: eq(contextSnapshots.hash, contextHash)
//   });

//   if (existingSnapshot) {
//     // Return cached batch
//     const cachedBatch = await db.query.batches.findFirst({
//       where: eq(batches.contextSnapshotId, existingSnapshot.id)
//     });
    
//     if (cachedBatch) {
//       const cachedPosts = await db.query.posts.findMany({
//         where: eq(posts.batchId, cachedBatch.id)
//       });
      
//       return NextResponse.json({
//         fromCache: true,
//         batchId: cachedBatch.id,
//         posts: cachedPosts
//       });
//     }
//   }

//   // 7. Build the full context string for the LLM
//   const fullContext = buildContext({
//     websiteContent: websiteScrape.content,
//     creativeGrayContent: await loadSeedFile('creativegray_master.md'),
//     userDocs: userDocs.map(d => d.content).join('\n\n'),
//     userConfig,
//   });

//   // 8. Generate new content
//   const generatedPosts = await callGemini(fullContext, userConfig);

//   // 9. Store the context snapshot
//   const contextSnapshot = await db.insert(contextSnapshots).values({
//     userId,
//     weekKey,
//     hash: contextHash,
//     websiteScrapeId: websiteScrape.id,
//     knowledgeBaseIds: userDocs.map(d => d.id),
//     userConfig,
//     fullContextString: fullContext,
//   }).returning().then(rows => rows[0]);

//   // 10. Store the batch and posts (your existing logic)
//   const batchId = uuidv4();
//   await db.insert(batches).values({
//     id: batchId,
//     contextHash,
//     contextSnapshotId: contextSnapshot.id,
//     websiteScrapeId: websiteScrape.id,
//     weekKey,
//     postCount: generatedPosts.length,
//     status: 'draft',
//     fromCache: false,
//   });

//   // ... insert posts (your existing code)
// }