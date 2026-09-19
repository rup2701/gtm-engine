// Server Component — no 'use client'
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, organizations, subscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUserId, getCurrentOrgId } from "@/lib/auth";
import { ProfileForm } from "./profile-form";
import Link from "next/link";
import { OrgNameForm } from "./org-name-form";


const TABS = [
  { id: "profile", label: "Profile" },
  { id: "subscription", label: "Subscription" },
  { id: "team", label: "Team" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const organizationId = await getCurrentOrgId();
  if (!organizationId) redirect("/login");

  const { tab } = await searchParams;
  const activeTab: TabId = TABS.some((t) => t.id === tab)
    ? (tab as TabId)
    : "profile";

  const [user, org, subscription] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    }),
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId),
    }),
  ]);

  if (!user || !org) redirect("/login");

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <nav className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id, label }) => (
          <Link
            key={id}
            href={`/account?tab=${id}`}
            className={`px-4 py-2 text-md font-medium border-b-2 -mb-px transition ${
              activeTab === id
                ? "border-[var(--brand)] text-[var(--brand-hover)]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* ── Profile ─────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <section className="space-y-4">
          <ProfileForm defaultName={user.name ?? ""} />
          <p className="text-sm text-gray-500">
            Signed in as <span className="text-foreground">{user.email}</span>
            {user.email?.endsWith("@x.placeholder") && " (X account — no email on file)"}
          </p>
        </section>
      )}

      {/* ── Subscription ────────────────────────────────────── */}
      {activeTab === "subscription" && (
        <section className="space-y-2">
          {subscription ? (
            <>
              <p className="text-sm">
                Plan: <strong>{subscription.tier ?? subscription.status}</strong>
              </p>
              <p className="text-sm text-gray-500">Status: {subscription.status}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No active subscription.</p>
          )}
          {/* Billing portal / upgrade CTA goes here post-MVP */}
        </section>
      )}

      {/* ── Team ────────────────────────────────────────────── */}
      {activeTab === "team" && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Organization</h3>
            <OrgNameForm defaultName={org.name} />
            {org.slug && (
              <p className="text-xs text-gray-500 mt-1">slug: {org.slug}</p>
            )}
          </div>

          <div className="border rounded-lg p-4 text-sm text-gray-500">
            <p className="mb-1">
              <span className="text-foreground">{user.name ?? user.email}</span> — you (owner)
            </p>
            <p>Team invitations are coming soon.</p>
          </div>
        </section>
      )}
    </main>
  );
}