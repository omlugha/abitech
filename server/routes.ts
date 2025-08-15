import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add CORS headers for all routes
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
  });

  // Random song API endpoint
  app.get("/random", async (req, res) => {
    try {
      const randomSong = await storage.getRandomSong();
      
      if (!randomSong) {
        return res.status(404).json({ 
          error: "No songs available",
          message: "The song database is currently empty"
        });
      }

      // Extract artist from title properly  
      const titleParts = randomSong.title.split(" - ");
      const artist = titleParts.length > 1 ? titleParts[0] : "Unknown Artist";
      const trackName = titleParts.length > 1 ? titleParts.slice(1).join(" - ") : randomSong.title;

      // Return well-formatted JSON response
      const response = {
        status: "success",
        data: {
          id: randomSong.id,
          title: randomSong.title,
          artist: artist,
          track: trackName,
          links: {
            stream: randomSong.streamUrl,
            download: randomSong.downloadUrl,
            thumbnail: randomSong.thumbnailUrl
          },
          metadata: {
            source: "No Copyright Sounds (NCS)",
            license: "Copyright Free",
            format: "MP3",
            quality: "High Quality",
            type: "NCS Release"
          }
        },
        timestamp: new Date().toISOString(),
        endpoint: "/random",
        version: "2.0"
      };

      // Use JSON.stringify with proper indentation for pretty printing
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Error fetching random song:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to fetch random song"
      });
    }
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    const response = {
      status: "online",
      timestamp: new Date().toISOString()
    };
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response, null, 2));
  });

  const httpServer = createServer(app);
  return httpServer;
}
