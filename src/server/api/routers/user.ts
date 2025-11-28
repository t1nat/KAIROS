import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const userRouter = createTRPCRouter({
  
  getCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          createdAt: true, 
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    }),

  
  setPersonalMode: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.update(users)
        .set({ usageMode: "personal" })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: {
          id: true,
          usageMode: true,
          name: true,
          email: true,
          bio: true,       
          image: true,     
          createdAt: true, 
        },
        with: {
          organizationMemberships: {
            limit: 1,
            with: {
              organization: true,
            },
          },
        },
      });

      
      if (!user?.usageMode) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,           
        image: user.image,       
        createdAt: user.createdAt, 
        usageMode: user.usageMode,
        organization: user.organizationMemberships[0]?.organization ?? null,
        role: user.organizationMemberships[0]?.role ?? null,
      };
    }),


  checkOnboardingStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: {
          usageMode: true,
        },
        with: {
          organizationMemberships: {
            limit: 1,
          },
        },
      });

      return {
        needsOnboarding: !user?.usageMode,
        usageMode: user?.usageMode,
        hasOrganization: (user?.organizationMemberships?.length ?? 0) > 0,
      };
    }),


  uploadProfileImage: protectedProcedure
    .input(
      z.object({
        image: z.string().min(1), 
        filename: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      
      await new Promise((resolve) => setTimeout(resolve, 500));

      await ctx.db.update(users)
        .set({ image: input.image })
        .where(eq(users.id, ctx.session.user.id));

      return {
        success: true,
        imageUrl: input.image,
      };
    }),

    searchByEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      return user ?? null;
    }),
});