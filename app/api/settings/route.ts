// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { MY_USER_ID } from '@/lib/constants';

export async function GET() {
  try {
    // Hardcoded for MVP — you're the only user
    const [settings] = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, MY_USER_ID));

    return NextResponse.json({
      success: true,
      settings: settings || null,
      twitterConnected: !!settings?.twitterBearerToken,
      linkedinConnected: !!settings?.linkedinAccessToken,
      discordConnected: !!settings?.discordWebhookUrl,
      // Return existing values so UI can populate them
      twitterBearerToken: settings?.twitterBearerToken || '',
      linkedinAccessToken: settings?.linkedinAccessToken || '',
      discordWebhookUrl: settings?.discordWebhookUrl || '',
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
    const body = await request.json();
    const { channelId, token } = body;

    // Map channelId to DB column
    const updateData: any = {};
    if (channelId === 'x') updateData.twitterBearerToken = token;
    if (channelId === 'linkedin') updateData.linkedinAccessToken = token;
    if (channelId === 'discord') updateData.discordWebhookUrl = token;

    // Update or insert
    const [existing] = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, MY_USER_ID));

    if (existing) {
      await db.update(userSettings)
        .set(updateData)
        .where(eq(userSettings.userId, MY_USER_ID));
    } else {
      await db.insert(userSettings).values({
        userId: MY_USER_ID,
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