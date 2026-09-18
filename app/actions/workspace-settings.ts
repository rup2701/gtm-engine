"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

interface UpdateDistributionInput {
  productId: string;
  organizationId: string;
  publishTimes: string[];
  platforms: string[];
  autoPublish: boolean;
  frequencyMin: number;
  frequencyMax: number;
}

export async function updateDistributionSettings(input: UpdateDistributionInput) {
  try {
    // 🔐 Security double-check: ensure the product belongs to the active organization
    await db
      .update(products)
      .set({
        publishTimes: input.publishTimes,
        platforms: input.platforms,
        autoPublish: input.autoPublish,
        frequencyMin: input.frequencyMin,
        frequencyMax: input.frequencyMax,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, input.productId),
          eq(products.organizationId, input.organizationId)
        )
      );

    // Refresh data caches for the current routing view instantly
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("[Workspace Settings Update Error]:", error);
    return { success: false, error: "Failed to update distribution pipeline parameters." };
  }
}
