// lib/context/extractBrandContext.ts
'use server';

import { GoogleGenAI } from '@google/genai';
import 'dotenv/config'; // Ensure environment variables are loaded

export async function extractBrandContext(scraped: {
  raw_text: string;
}) {

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
      model: 'gemini-2.5-flash', // Still utilizing the working active production cluster
      contents: `Extract structured brand context for a content generation tool.
        Return ONLY valid JSON. No markdown, no commentary. Content: ${scraped.raw_text.slice(0, 3000)} 

      {
        "brandName": "clean company or product name",
        "description": "one-line description of what they do (max 120 chars)",
        "icp": "who they serve — be specific, not generic",
        "tone": "voice and style (e.g. 'direct, founder-first, no fluff')",
        "suggestedCategories": ["engineering", "product", "ux", "marketing", "launch", "build"]
      }`,
      config: {
        responseMimeType: 'application/json', // Pure JSON generation config
      },
    });

    // 4. Clean extraction syntax: No more '.candidates.content.parts.text' array mess!
    const text = response.text; 
    console.log('Extracted Brand Context:', text);
    if (!text) {
      throw new Error('No content returned from Gemini model.');
    }
    return JSON.parse(text);
}