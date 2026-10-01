import { getCurrentOrgId, getCurrentUserId } from "@/lib/auth";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { isValidUuid } from "@/lib/utils/uuid";
import { DistributionForm } from "@/app/components/DistributionForm";
import { ChannelSelector } from "./ChannelSelector";
import { getOrganizationSocialAccount } from "@/lib/social-connections";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const { productId } = await searchParams;
  const organizationId = await getCurrentOrgId();

  // Resolve the product being configured — always scoped to the org.
  // Ignore an invalid/stale productId (e.g. "null" from a missing active
  // product) rather than passing it straight into a uuid column lookup.
  const currentProduct = isValidUuid(productId)
    ? await db.query.products.findFirst({
        where: and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId),
        ),
      })
    : await db.query.products.findFirst({
        where: eq(products.organizationId, organizationId), // fallback: org's first product
      });

  if (!currentProduct) redirect("/dashboard?addProduct=true");

  const [linkedinAccount, twitterAccount] = await Promise.all([
    getOrganizationSocialAccount(organizationId, "linkedin"),
    getOrganizationSocialAccount(organizationId, "twitter"),
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
        Choose where this workspace publishes. Social connections are shared across workspaces and managed in Account Settings → Connections.
      </p>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] space-y-6">
        <ChannelSelector
          productId={currentProduct.id}
          platforms={currentProduct.platforms ?? []}
          connectedProviders={[
            ...(linkedinAccount && !linkedinAccount.needsReauth ? ['linkedin'] : []),
            ...(twitterAccount && !twitterAccount.needsReauth ? ['twitter'] : []),
          ]}
        />
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="text-lg font-semibold">Distribution & Automation Schedule</h3>
        <DistributionForm product={currentProduct} />
      </div>
    </div>
  );
}