import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "~/server/auth";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
  chatAttachment: f({ 
    image: { maxFileSize: "8MB", maxFileCount: 5 },
    pdf: { maxFileSize: "16MB", maxFileCount: 3 }
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;