import { z } from "zod";

export interface Song {
  id: string;
  title: string;
  streamUrl: string;
  downloadUrl: string;
  thumbnailUrl: string;
}

export const songSchema = z.object({
  id: z.string(),
  title: z.string(),
  streamUrl: z.string().url(),
  downloadUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
});

export type SongResponse = z.infer<typeof songSchema>;
