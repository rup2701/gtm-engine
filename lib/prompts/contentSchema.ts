import { Type } from '@google/genai';

export const contentResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      // 🎯 FIX: Force Gemini to output lowercase 3-letter tokens instead of full string names
      day: { 
        type: Type.STRING, 
        description: "Must be lowercase 3-letter weekday abbreviation only: 'mon', 'tue', 'wed', 'thu', or 'fri'" 
      },
      time: {
        type: Type.STRING,
        description: "24-hour format without timezone, e.g. '09:00'",
      },
      category: { type: Type.STRING, description: 'One of the allowed categories' },
      platform: { type: Type.STRING, description: 'One of the allowed platforms' },
      content: { type: Type.STRING, description: 'Full post text, platform-native' },
      hook: { type: Type.STRING, description: 'First line hook for preview cards' },
    },
    required: ['day', 'time', 'category', 'platform', 'content'],
  },
};
