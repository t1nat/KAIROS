// src/server/api/routers/document.ts (DRIZZLE VERSION)

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { documents, documentCollaborators, documentVersions, organizationMembers, users } from "~/server/db/schema";
import { eq, or, desc, and, sql } from "drizzle-orm";

// Helper function to generate random color for collaborator
function generateRandomColor(): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // yellow
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
  ];
  return colors[Math.floor(Math.random() * colors.length)]!;
}

export const documentRouter = createTRPCRouter({
  // Create new document
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      content: z.string(),
      password: z.string().optional(),
      annotations: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's organization if they have one
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, ctx.session.user.id),
      });

      // Hash password if provided
      let passwordHash: string | undefined;
      if (input.password) {
        passwordHash = await bcrypt.hash(input.password, 10);
      }

      const [document] = await ctx.db.insert(documents).values({
        title: input.title,
        content: input.content,
        passwordHash,
        annotations: input.annotations,
        createdById: ctx.session.user.id,
        organizationId: membership?.organizationId,
      }).returning();

      if (!document) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Add creator as collaborator
      await ctx.db.insert(documentCollaborators).values({
        documentId: document.id,
        userId: ctx.session.user.id,
        color: generateRandomColor(),
      });

      return document;
    }),

  // Get user's documents
  getMyDocuments: protectedProcedure
    .query(async ({ ctx }) => {
      const docs = await ctx.db.query.documents.findMany({
        where: or(
          eq(documents.createdById, ctx.session.user.id),
          // Documents where user is a collaborator
          sql`EXISTS (
            SELECT 1 FROM ${documentCollaborators}
            WHERE ${documentCollaborators.documentId} = ${documents.id}
            AND ${documentCollaborators.userId} = ${ctx.session.user.id}
          )`
        ),
        with: {
          createdBy: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
          collaborators: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          versions: true,
        },
        orderBy: [desc(documents.updatedAt)],
      });

      return docs.map(doc => ({
        ...doc,
        _count: {
          versions: doc.versions.length,
        },
      }));
    }),

  // Get single document by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
      password: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: eq(documents.id, input.id),
        with: {
          createdBy: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
          collaborators: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          organization: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      // Check if user has access
      const hasAccess = 
        document.createdById === ctx.session.user.id ||
        document.collaborators.some(c => c.userId === ctx.session.user.id);

      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Check password if document is protected
      if (document.passwordHash) {
        if (!input.password) {
          throw new TRPCError({ 
            code: "UNAUTHORIZED", 
            message: "PASSWORD_REQUIRED" 
          });
        }

        const isValid = await bcrypt.compare(input.password, document.passwordHash);
        if (!isValid) {
          throw new TRPCError({ 
            code: "UNAUTHORIZED", 
            message: "INCORRECT_PASSWORD" 
          });
        }
      }

      return document;
    }),

  // Update document content
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().optional(),
      title: z.string().optional(),
      annotations: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: eq(documents.id, input.id),
        with: {
          collaborators: true,
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const hasAccess = 
        document.createdById === ctx.session.user.id ||
        document.collaborators.some(c => c.userId === ctx.session.user.id);

      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Create version snapshot if content changed
      if (input.content && input.content !== document.content) {
        await ctx.db.insert(documentVersions).values({
          documentId: document.id,
          content: document.content,
          annotations: document.annotations,
          createdById: ctx.session.user.id,
        });
      }

      // Update document
      const [updated] = await ctx.db.update(documents)
        .set({
          content: input.content,
          title: input.title,
          annotations: input.annotations,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.id))
        .returning();

      // Update collaborator's last edit time
      await ctx.db.update(documentCollaborators)
        .set({ lastEdit: new Date() })
        .where(
          and(
            eq(documentCollaborators.documentId, input.id),
            eq(documentCollaborators.userId, ctx.session.user.id)
          )
        );

      return updated;
    }),

  // Delete document
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: eq(documents.id, input.id),
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (document.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.delete(documents)
        .where(eq(documents.id, input.id));

      return { success: true };
    }),

  // Add collaborator
  addCollaborator: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: eq(documents.id, input.documentId),
      });

      if (!document || document.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.insert(documentCollaborators).values({
        documentId: input.documentId,
        userId: input.userId,
        color: generateRandomColor(),
      });

      return { success: true };
    }),

  // Request password reset
  requestPasswordReset: protectedProcedure
    .input(z.object({
      documentId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: eq(documents.id, input.documentId),
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (document.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Generate reset token
      const resetToken = crypto.randomUUID();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await ctx.db.update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        })
        .where(eq(users.id, ctx.session.user.id));

      // TODO: Send email with reset token
      // await sendPasswordResetEmail(ctx.session.user.email, resetToken);

      return { 
        success: true,
        message: "Reset email sent" 
      };
    }),

  // Reset password with token
  resetPassword: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      token: z.string(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });

      if (!user?.passwordResetToken || 
          !user.passwordResetExpires || 
          user.passwordResetToken !== input.token ||
          user.passwordResetExpires < new Date()) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Invalid or expired token" 
        });
      }

      const document = await ctx.db.query.documents.findFirst({
        where: eq(documents.id, input.documentId),
      });

      if (!document || document.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(input.newPassword, 10);

      // Update document password
      await ctx.db.update(documents)
        .set({ passwordHash })
        .where(eq(documents.id, input.documentId));

      // Clear reset token
      await ctx.db.update(users)
        .set({
          passwordResetToken: null,
          passwordResetExpires: null,
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Get document versions
  getVersions: protectedProcedure
    .input(z.object({
      documentId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: eq(documents.id, input.documentId),
        with: {
          collaborators: true,
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const hasAccess = 
        document.createdById === ctx.session.user.id ||
        document.collaborators.some(c => c.userId === ctx.session.user.id);

      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const versions = await ctx.db.query.documentVersions.findMany({
        where: eq(documentVersions.documentId, input.documentId),
        with: {
          createdBy: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: [desc(documentVersions.createdAt)],
      });

      return versions;
    }),
});