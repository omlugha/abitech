import { z } from "zod";

export interface Song {
  id: string;
  title: string;
  streamUrl: string;
  downloadUrl: string;
  thumbnailUrl: string;
  duration: string; // Added duration field
}

export const songSchema = z.object({
  id: z.string(),
  title: z.string(),
  streamUrl: z.string().url(),
  downloadUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  duration: z.string().regex(/^([0-5]?\d):([0-5]\d)$|^Unknown$/) // Added duration validation (MM:SS format or "Unknown")
});

export type SongResponse = z.infer<typeof songSchema>;
