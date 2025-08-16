import { type Song } from "@shared/schema";
import { randomUUID } from "crypto";
// @ts-ignore - Package may not have types
import ncs from "nocopyrightsounds-api";

export interface IStorage {
  getRandomSong(): Promise<Song | undefined>;
  getAllSongs(): Promise<Song[]>;
}

export class MemStorage implements IStorage {
  private songs: Song[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

  constructor() {
    this.loadInitialSongs();
  }

  private async loadInitialSongs(): Promise<void> {
    try {
      // Don't load if we already have songs and cache is still valid
      if (this.songs.length > 0 && Date.now() - this.lastFetch < this.CACHE_DURATION) {
        return;
      }
      
      // Fetch multiple pages to get thousands of songs
      const pages = Array.from({length: 25}, (_, i) => i + 1); // First 25 pages
      const allSongs: Song[] = [];

      for (const page of pages) {
        try {
          const ncsResponse = await ncs.getSongs(page);
          
          if (ncsResponse && Array.isArray(ncsResponse)) {
            for (const ncsTrack of ncsResponse) {
              if (ncsTrack.name && ncsTrack.download && ncsTrack.coverUrl) {
                const artistNames = ncsTrack.artists ? ncsTrack.artists.map((artist: any) => artist.name).join(', ') : 'Unknown Artist';
                const song: Song = {
                  id: randomUUID(),
                  title: `${artistNames} - ${ncsTrack.name} [NCS Release]`,
                  streamUrl: ncsTrack.previewUrl || ncsTrack.download.regular || "",
                  downloadUrl: ncsTrack.download.regular || "",
                  thumbnailUrl: ncsTrack.coverUrl || "",
                  duration: this.formatDuration(ncsTrack.duration) // Add duration from API
                };

                // Only add songs with valid URLs
                if (song.streamUrl && song.downloadUrl && song.thumbnailUrl) {
                  allSongs.push(song);
                }
              }
            }
          }
        } catch (pageError) {
          console.error(`Error fetching page ${page}:`, pageError);
        }
      }

      if (allSongs.length > 0) {
        this.songs = allSongs;
        this.lastFetch = Date.now();
        console.log(`Successfully loaded ${this.songs.length} real NCS songs`);
      } else {
        console.warn("No songs loaded, falling back to manual seed");
        await this.seedWithFallbackData();
      }
    } catch (error) {
      console.error("Error loading NCS songs:", error);
      await this.seedWithFallbackData();
    }
  }

  private formatDuration(durationInSeconds: number | string): string {
    if (!durationInSeconds) return "Unknown";
    
    const seconds = typeof durationInSeconds === 'string' 
      ? parseInt(durationInSeconds) 
      : durationInSeconds;
    
    if (isNaN(seconds)) return "Unknown";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private async seedWithFallbackData(): Promise<void> {
    // Minimal fallback - we'll try to get real data again later
    console.log("Using minimal fallback while retrying NCS API...");
    this.songs = [];
    
    // Try to load real data again after a delay
    setTimeout(() => {
      this.loadInitialSongs();
    }, 5000);
  }

  private async refreshSongsIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch > this.CACHE_DURATION) {
      console.log("Refreshing NCS songs cache after 24 hours...");
      await this.loadInitialSongs();
    }
  }

  async getRandomSong(): Promise<Song | undefined> {
    await this.refreshSongsIfNeeded();
    
    if (this.songs.length === 0) {
      // Try to fetch at least one page of songs
      try {
        console.log("No cached songs, fetching fresh data...");
        const ncsResponse = await ncs.getSongs(1);
        
        if (ncsResponse && Array.isArray(ncsResponse) && ncsResponse.length > 0) {
          const ncsTrack = ncsResponse[Math.floor(Math.random() * ncsResponse.length)];
          
          if (ncsTrack.name && ncsTrack.download && ncsTrack.coverUrl) {
            const artistNames = ncsTrack.artists ? ncsTrack.artists.map((artist: any) => artist.name).join(', ') : 'Unknown Artist';
            return {
              id: randomUUID(),
              title: `${artistNames} - ${ncsTrack.name} [NCS Release]`,
              streamUrl: ncsTrack.previewUrl || ncsTrack.download.regular || "",
              downloadUrl: ncsTrack.download.regular || "",
              thumbnailUrl: ncsTrack.coverUrl || "",
              duration: this.formatDuration(ncsTrack.duration) // Add duration
            };
          }
        }
      } catch (error) {
        console.error("Error fetching fresh NCS data:", error);
      }
      return undefined;
    }
    
    const randomIndex = Math.floor(Math.random() * this.songs.length);
    return this.songs[randomIndex];
  }

  async getAllSongs(): Promise<Song[]> {
    await this.refreshSongsIfNeeded();
    return this.songs;
  }
}

export const storage = new MemStorage();
