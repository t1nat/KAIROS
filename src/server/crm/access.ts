import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "~/server/api/trpc";
import { and, eq } from "drizzle-orm";
import { organizationMembers } from "~/server/db/schemas/organizations";

export type CrmSessionUser = {
  id: string;
};

export type CrmMembership = {
  organizationId: number;
  role: "admin" | "member" | "guest" | "worker" | "mentor";
};

export async function requireUser(ctx: TRPCContext): Promise<CrmSessionUser> {
  const user = ctx.session?.user;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return { id: user.id };
}

export async function requireOrgMembership(
  ctx: TRPCContext,
  organizationId: number,
): Promise<CrmMembership> {
  const user = await requireUser(ctx);

  const membership = await ctx.db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, user.id),
    ),
    columns: {
      organizationId: true,
      role: true,
    },
  });

  if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

  return {
    organizationId: membership.organizationId,
    role: membership.role,
  };
}

export function isCrmAdmin(m: CrmMembership): boolean {
  return m.role === "admin";
}

export function canCrmReadOwnedRecord(args: {
  membership: CrmMembership;
  ownerUserId: string;
  sessionUserId: string;
}): boolean {
  const { membership, ownerUserId, sessionUserId } = args;
  if (isCrmAdmin(membership)) return true;
  if (membership.role === "mentor" || membership.role === "guest") return false;
  return ownerUserId === sessionUserId;
}

export function canCrmWriteOwnedRecord(args: {
  membership: CrmMembership;
  ownerUserId: string;
  sessionUserId: string;
}): boolean {
  const { membership, ownerUserId, sessionUserId } = args;
  if (isCrmAdmin(membership)) return true;
  if (membership.role === "mentor" || membership.role === "guest") return false;
  return ownerUserId === sessionUserId;
}

export function requireCrmWriteAccess(args: {
  membership: CrmMembership;
  ownerUserId: string;
  sessionUserId: string;
}) {
  if (!canCrmWriteOwnedRecord(args)) throw new TRPCError({ code: "FORBIDDEN" });
}
