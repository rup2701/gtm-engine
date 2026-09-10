// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [settings] = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    return NextResponse.json({
      success: true,
      settings: settings
        ? {
            id: settings.id,
            userId: settings.userId,
            frequencyMin: settings.frequencyMin,
            frequencyMax: settings.frequencyMax,
            publishTimes: settings.publishTimes,
            autoPublish: settings.autoPublish,
            tone: settings.tone,
            icp: settings.icp,
          }
        : null,
      twitterConnected: !!settings?.twitterBearerToken,
      linkedinConnected: !!settings?.linkedinAccessToken,
      discordConnected: !!settings?.discordWebhookUrl,
    });

  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load settings',
        twitterConnected: false,
        linkedinConnected: false,
        discordConnected: false,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, token } = body;

    // Map channelId to DB column
    const updateData: Partial<typeof userSettings.$inferInsert> = {};
    if (channelId === 'x') updateData.twitterBearerToken = token;
    if (channelId === 'linkedin') updateData.linkedinAccessToken = token;
    if (channelId === 'discord') updateData.discordWebhookUrl = token;

    // Update or insert
    const [existing] = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    if (existing) {
      await db.update(userSettings)
        .set(updateData)
        .where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values({
        userId,
        ...updateData,
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Token saved for ${channelId}` 
    });

  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}


// app/api/settings/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/db';
// import { userSettings } from '@/db/schema';
// import { eq } from 'drizzle-orm';
// import { encrypt, decrypt } from '@/lib/encryption'; // You'll need this

// export async function PUT(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       userId,
//       twitterApiKey, 
//       twitterApiSecret,
//       linkedinAccessToken,
//       redditUsername,
//       redditPassword,
//       publishTimes,
//       frequencyMin,
//       frequencyMax,
//       platforms,
//       autoPublish,
//       tone,
//       icp
//     } = body;

//     // Encrypt sensitive data
//     const encryptedTwitterKey = twitterApiKey ? encrypt(twitterApiKey) : undefined;
//     const encryptedTwitterSecret = twitterApiSecret ? encrypt(twitterApiSecret) : undefined;
//     const encryptedLinkedInToken = linkedinAccessToken ? encrypt(linkedinAccessToken) : undefined;

//     const [settings] = await db.update(userSettings)
//       .set({
//         twitterApiKey: encryptedTwitterKey,
//         twitterApiSecret: encryptedTwitterSecret,
//         linkedinAccessToken: encryptedLinkedInToken,
//         redditUsername,
//         redditPassword: redditPassword ? encrypt(redditPassword) : undefined,
//         publishTimes,
//         frequencyMin,
//         frequencyMax,
//         platforms,
//         autoPublish,
//         tone,
//         icp,
//         updatedAt: new Date()
//       })
//       .where(eq(userSettings.userId, userId))
//       .returning();

//     return NextResponse.json({
//       success: true,
//       settings
//     });
//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Failed to save settings' },
//       { status: 500 }
//     );
//   }
// }