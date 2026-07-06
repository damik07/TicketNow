// src/app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";

export const dynamic = 'force-dynamic';

const f = createUploadthing();

export const ourFileRouter = {
  // En v7 se mantiene la definición, pero la validación interna es más robusta
  bannerUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Subida completada. URL:", file.url);
      return { uploadedBy: "Organizer" };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;