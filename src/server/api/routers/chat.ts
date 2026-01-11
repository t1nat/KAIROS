import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, type TRPCContext } from "~/server/api/trpc";
import {
  directConversations,
  directMessages,
  organizationMembers,
  projectCollaborators,
  projects,
  users,
} from "~/server/db/schema";
import { and, asc, desc, eq, inArray, or, sql, isNull } from "drizzle-orm";

async function assertProjectAccess(ctx: TRPCContext, projectId: number) {
  if (!ctx.session?.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });

  const [project] = await ctx.db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

  const userId: string = ctx.session.user.id;
  const isOwner = project.createdById === userId;

  let isOrgMember = false;
  if (project.organizationId) {
    const [membership] = await ctx.db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, project.organizationId), eq(organizationMembers.userId, userId)))
      .limit(1);
    isOrgMember = !!membership;
  }

  if (isOwner || isOrgMember) return project;

  const [collaboration] = await ctx.db
    .select()
    .from(projectCollaborators)
    .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.collaboratorId, userId)))
    .limit(1);

  if (!collaboration) throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this project" });
  return project;
}

function normalizePair(a: string, b: string): { userOneId: string; userTwoId: string } {
  return a < b ? { userOneId: a, userTwoId: b } : { userOneId: b, userTwoId: a };
}

export const chatRouter = createTRPCRouter({
  listProjectUsers: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await assertProjectAccess(ctx, input.projectId);
      const selfId: string = ctx.session.user.id;

      if (project.organizationId) {
        const members = await ctx.db
          .select({
            id: users.id,
            name: users.name,
            image: users.image,
          })
          .from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .where(eq(organizationMembers.organizationId, project.organizationId))
          .orderBy(asc(users.name));

        return members.filter((m: { id: string }) => m.id !== selfId);
      }

      const collaborators = await ctx.db
        .select({ collaboratorId: projectCollaborators.collaboratorId })
        .from(projectCollaborators)
        .where(eq(projectCollaborators.projectId, input.projectId));

      const ids = Array.from(
        new Set([
          project.createdById,
          ...collaborators.map((c: { collaboratorId: string }) => c.collaboratorId),
        ]),
      ).filter((id) => id !== selfId);

      if (ids.length === 0) return [];

      return ctx.db
        .select({ id: users.id, name: users.name, image: users.image })
        .from(users)
        .where(inArray(users.id, ids));
    }),

  getOrCreateProjectConversation: protectedProcedure
    .input(z.object({ projectId: z.number(), otherUserId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const project = await assertProjectAccess(ctx, input.projectId);
      const selfId: string = ctx.session.user.id;
      if (input.otherUserId === selfId) throw new TRPCError({ code: "BAD_REQUEST", message: "Can't start a chat with yourself" });

      // Verify the other user can access the project too.
      if (project.organizationId) {
        const [membership] = await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, project.organizationId),
              eq(organizationMembers.userId, input.otherUserId),
            ),
          )
          .limit(1);
        if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "That user is not in this organization" });
      } else {
        const allowedIds = new Set<string>();
        allowedIds.add(project.createdById);
        const collaborators = await ctx.db
          .select({ collaboratorId: projectCollaborators.collaboratorId })
          .from(projectCollaborators)
          .where(eq(projectCollaborators.projectId, input.projectId));
        for (const c of collaborators as Array<{ collaboratorId: string }>) allowedIds.add(c.collaboratorId);
        if (!allowedIds.has(input.otherUserId)) throw new TRPCError({ code: "FORBIDDEN", message: "That user doesn't have access to this project" });
      }

      const { userOneId, userTwoId } = normalizePair(selfId, input.otherUserId);

      const [existing] = await ctx.db
        .select({ id: directConversations.id })
        .from(directConversations)
        .where(
          and(
            eq(directConversations.projectId, input.projectId),
            eq(directConversations.userOneId, userOneId),
            eq(directConversations.userTwoId, userTwoId),
          ),
        )
        .limit(1);

      if (existing) return { conversationId: existing.id };

      const [created] = await ctx.db
        .insert(directConversations)
        .values({
          projectId: input.projectId,
          organizationId: project.organizationId ?? null,
          userOneId,
          userTwoId,
          lastMessageAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .returning({ id: directConversations.id });

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create conversation" });
      return { conversationId: created.id };
    }),

  listMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const selfId: string = ctx.session.user.id;

      const [convo] = await ctx.db
        .select({
          id: directConversations.id,
          userOneId: directConversations.userOneId,
          userTwoId: directConversations.userTwoId,
        })
        .from(directConversations)
        .where(eq(directConversations.id, input.conversationId))
        .limit(1);

      if (!convo) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      if (convo.userOneId !== selfId && convo.userTwoId !== selfId) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db
        .select({
          id: directMessages.id,
          body: directMessages.body,
          createdAt: directMessages.createdAt,
          senderId: directMessages.senderId,
          senderName: users.name,
          senderImage: users.image,
        })
        .from(directMessages)
        .innerJoin(users, eq(users.id, directMessages.senderId))
        .where(eq(directMessages.conversationId, input.conversationId))
        .orderBy(asc(directMessages.createdAt));
    }),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.number(), body: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const selfId: string = ctx.session.user.id;

      const [convo] = await ctx.db
        .select({
          id: directConversations.id,
          userOneId: directConversations.userOneId,
          userTwoId: directConversations.userTwoId,
        })
        .from(directConversations)
        .where(eq(directConversations.id, input.conversationId))
        .limit(1);

      if (!convo) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      if (convo.userOneId !== selfId && convo.userTwoId !== selfId) throw new TRPCError({ code: "FORBIDDEN" });

      const [message] = await ctx.db
        .insert(directMessages)
        .values({
          conversationId: input.conversationId,
          senderId: selfId,
          body: input.body,
        })
        .returning({
          id: directMessages.id,
          body: directMessages.body,
          createdAt: directMessages.createdAt,
          senderId: directMessages.senderId,
        });

      await ctx.db
        .update(directConversations)
        .set({ lastMessageAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(directConversations.id, input.conversationId));

      const [sender] = await ctx.db
        .select({ name: users.name, image: users.image })
        .from(users)
        .where(eq(users.id, selfId))
        .limit(1);

      return {
        ...message,
        senderName: sender?.name ?? null,
        senderImage: sender?.image ?? null,
      };
    }),

  listProjectConversations: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx, input.projectId);
      const selfId: string = ctx.session.user.id;

      return ctx.db
        .select({
          id: directConversations.id,
          userOneId: directConversations.userOneId,
          userTwoId: directConversations.userTwoId,
          lastMessageAt: directConversations.lastMessageAt,
        })
        .from(directConversations)
        .where(and(eq(directConversations.projectId, input.projectId), or(eq(directConversations.userOneId, selfId), eq(directConversations.userTwoId, selfId))))
        .orderBy(desc(directConversations.lastMessageAt));
    }),

  listAllConversations: protectedProcedure
    .query(async ({ ctx }) => {
      const selfId: string = ctx.session.user.id;

      const convos = await ctx.db
        .select({
          id: directConversations.id,
          userOneId: directConversations.userOneId,
          userTwoId: directConversations.userTwoId,
          lastMessageAt: directConversations.lastMessageAt,
        })
        .from(directConversations)
        .where(or(eq(directConversations.userOneId, selfId), eq(directConversations.userTwoId, selfId)))
        .orderBy(desc(directConversations.lastMessageAt));

      const result = [];
      for (const convo of convos) {
        const [userOne] = await ctx.db
          .select({ id: users.id, name: users.name, email: users.email, image: users.image })
          .from(users)
          .where(eq(users.id, convo.userOneId))
          .limit(1);

        const [userTwo] = await ctx.db
          .select({ id: users.id, name: users.name, email: users.email, image: users.image })
          .from(users)
          .where(eq(users.id, convo.userTwoId))
          .limit(1);

        if (userOne && userTwo) {
          result.push({
            id: convo.id,
            userOne,
            userTwo,
            lastMessageAt: convo.lastMessageAt,
          });
        }
      }

      return result;
    }),

  getOrCreateDirectConversation: protectedProcedure
    .input(z.object({ otherUserId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const selfId: string = ctx.session.user.id;
      if (input.otherUserId === selfId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can't start a chat with yourself" });
      }

      const { userOneId, userTwoId } = normalizePair(selfId, input.otherUserId);

      const [existing] = await ctx.db
        .select({ id: directConversations.id })
        .from(directConversations)
        .where(
          and(
            eq(directConversations.userOneId, userOneId),
            eq(directConversations.userTwoId, userTwoId),
            isNull(directConversations.projectId)
          )
        )
        .limit(1);

      if (existing) return { conversationId: existing.id };

      const [created] = await ctx.db
        .insert(directConversations)
        .values({
          projectId: null,
          organizationId: null,
          userOneId,
          userTwoId,
          lastMessageAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .returning({ id: directConversations.id });

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create conversation" });
      return { conversationId: created.id };
    }),
});
