import { getCurrentOrgId, getCurrentUserId } from "@/lib/auth";
import { db } from "@/db";
import { accounts, products } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import IntegrationButtons from "@/app/components/ui/IntegrationButtons";
import { DistributionForm } from "@/app/components/DistributionForm";
import { ChannelSelector } from "./ChannelSelector";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const { productId } = await searchParams;
  const organizationId = await getCurrentOrgId();

  // Resolve the product being configured — always scoped to the user
 // Resolve the product being configured — always scoped to the org
  const currentProduct = productId
    ? await db.query.products.findFirst({
        where: and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId),
        ),
      })
    : await db.query.products.findFirst({
        where: eq(products.organizationId, organizationId), // fallback: org's first product
      });

  if (!currentProduct) notFound();

  const [linkedinAccount, twitterAccount] = await Promise.all([
    db.query.accounts.findFirst({
      where: and(eq(accounts.userId, userId), eq(accounts.provider, "linkedin")),
    }),
    db.query.accounts.findFirst({
      where: and(eq(accounts.userId, userId), eq(accounts.provider, "twitter")),
    }),
  ]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure distribution networks, scheduling cadences, and execution boundaries for{" "}
          <strong className="text-foreground">{currentProduct.name}</strong>.
        </p>
      </div>

      <h2 className="text-lg font-semibold mb-2">Channels</h2>
      <p className="text-sm text-gray-500 mb-4">
        Choose where this product publishes, and connect your accounts.
      </p>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] space-y-6">
        <ChannelSelector
          productId={currentProduct.id}
          platforms={currentProduct.platforms ?? []}
          connectedProviders={[
            ...(linkedinAccount ? ['linkedin'] : []),
            ...(twitterAccount ? ['twitter'] : []),
          ]}
        />
        <hr className="border-border border-dashed" />
        <IntegrationButtons
          isLinkedInConnected={!!linkedinAccount}
          isTwitterConnected={!!twitterAccount}
          isDiscordConnected={false}
          isBlueSkyConnected={false}
        />
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-lg font-semibold">Distribution & Automation Schedule</h3>
        <DistributionForm product={currentProduct} />
      </div>
    </div>
  );
}