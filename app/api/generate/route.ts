import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
// import 'dotenv/config'; // Ensure environment variables are loaded
import { GoogleGenAI } from '@google/genai';

// Type-safe category enforcement matching your prompt requirements
const VALID_CATEGORIES = ['design', 'engineering', 'ux', 'marketing', 'launch', 'build'] as const;

async function loadContextFile(filename: string): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), 'data', filename);
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.warn(`⚠️ Context file not found or unreadable: ${filename}. Proceeding without it.`);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Optional: Allow overriding weeks/days via request body in the future
    // For now, defaults to the 5-day / 3-5 posts per day spec
    const body = await request.json().catch(() => ({}));
    const weeksToGenerate = body.weeks ?? 1;

    // 1. Load both master contexts asynchronously from /data directory
    const [creativeGrayContext, appnomicsContext] = await Promise.all([
      loadContextFile('creativegray_master.md'),
      loadContextFile('appnomics_master.md'),
    ]);

    if (!appnomicsContext) {
      return NextResponse.json(
        { error: 'appnomics_master.md is required but was not found in /data directory.' },
        { status: 400 }
      );
    }

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

    // 3. Build the system-enforced prompt
    const prompt = `You are the autonomous content and growth engine for Appnomics.

      ### THE FOUNDATION & PAST AUTHORITY: CreativeGray Studio (Reference Data)
      Use the following scraped background of CreativeGray's 12-year history, case studies (like EZLinks, PlaySquares, etc.), and architectural standards to establish undeniable authority and hard-earned engineering wisdom:
      ${creativeGrayContext || '[No CreativeGray context available - rely on general senior agency expertise]'}

      ### THE TARGET PRODUCT / THE FUTURE: Appnomics
      Use the following scraped details of Appnomics as the primary product being built, marketed, and scaled:
      ${appnomicsContext}

      ### EXECUTION REQUIREMENTS:
      1. **Volume & Cadence:** Generate a detailed, time-based content schedule for a full 5-day week, producing **3 to 5 posts per day**.
      2. **Category Enforcement:** Every single post must explicitly tag its primary category from this exact array: [${VALID_CATEGORIES.join(', ')}].
      3. **Platform Targeting:** Each post must specify its target platform (LinkedIn, Twitter/X, Reddit, etc.) and adapt tone/format accordingly.
      4. **Voice & Tone:** Authoritative founder perspective. Leverages CreativeGray's hard-earned lessons to explain *why* Appnomics exists and how it solves real developer/builder friction. Do not pitch CreativeGray services; pitch Appnomics.
      5. **The Angle:** "After building 20+ products and scaling software over a decade at CreativeGray, we built Appnomics to..."

      Output the result in a clean, machine-parsable Markdown schedule complete with timestamps, categories, target platforms, and full post text.`;

    // 4. Generate content
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Still utilizing the working active production cluster
      contents:  [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text;

    console.log('Generated content', text);

    if (!text) {
      throw new Error('Vertex AI returned empty content. Check model permissions and quota.');
    }

    return NextResponse.json({
      success: true,
      schedule: text,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gemini-2.5-flash',
        contextFilesLoaded: {
          creativeGray: !!creativeGrayContext,
          appnomics: !!appnomicsContext,
        },
      },
    });
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