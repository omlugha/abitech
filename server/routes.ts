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

  // Random song API endpoint - now supports multiple results
  app.get("/random", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 1; // Default to 1 song
      const maxCount = Math.min(count, 50); // Limit to 50 songs max per request
      
      const allSongs = await storage.getAllSongs();
      
      if (!allSongs || allSongs.length === 0) {
        return res.status(404).json({ 
          error: "No songs available",
          message: "The song database is currently empty"
        });
      }

      // Get random songs
      const randomSongs = [];
      const availableSongs = [...allSongs]; // Create a copy to avoid duplicates
      
      for (let i = 0; i < maxCount && availableSongs.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        randomSongs.push(availableSongs[randomIndex]);
        availableSongs.splice(randomIndex, 1); // Remove to avoid duplicates
      }

      // Format the response
      const response = {
        status: "success",
        data: randomSongs.map(song => {
          const titleParts = song.title.split(" - ");
          const artist = titleParts.length > 1 ? titleParts[0] : "Unknown Artist";
          const trackName = titleParts.length > 1 ? titleParts.slice(1).join(" - ") : song.title;

          return {
            id: song.id,
            title: song.title,
            artist: artist,
            track: trackName,
            duration: song.duration || "", // Added duration field
            links: {
              Bwm_stream_link: song.streamUrl,
              Bwm_download_link: song.downloadUrl,
              thumbnail: song.thumbnailUrl
            },
            metadata: {
              source: "Bwm xmd tech",
              license: "Copyright Free by xmd",
              format: "MP3",
              quality: "High Quality",
              type: "Bwm xmd release",
              duration: song.duration || "Below 5 minutes" // Also in metadata for consistency
            }
          };
        }),
        count: randomSongs.length,
        total_available: allSongs.length,
        timestamp: new Date().toISOString(),
        endpoint: "/random",
        version: "2.1"
      };

      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Error fetching random songs:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to fetch random songs"
      });
    }
  });

  // Search endpoint
  app.get("/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({
          error: "Missing search query",
          message: "Please provide a search term using the 'q' parameter"
        });
      }

      const allSongs = await storage.getAllSongs();
      const searchResults = allSongs.filter(song => 
        song.title.toLowerCase().includes(query.toLowerCase())
      );

      const response = {
        status: "success",
        data: searchResults.map(song => {
          const titleParts = song.title.split(" - ");
          const artist = titleParts.length > 1 ? titleParts[0] : "Unknown Artist";
          const trackName = titleParts.length > 1 ? titleParts.slice(1).join(" - ") : song.title;

          return {
            id: song.id,
            title: song.title,
            artist: artist,
            track: trackName,
            duration: song.duration || "", // Added duration field
            links: {
              Bwm_stream_link: song.streamUrl,
              Bwm_download_link: song.downloadUrl,
              thumbnail: song.thumbnailUrl
            },
            metadata: {
              source: "Bwm xmd tech",
              license: "Copyright Free by xmd",
              format: "MP3",
              quality: "High Quality",
              type: "Bwm xmd release",
              duration: song.duration || "Below 5 minutes" // Also in metadata for consistency
            }
          };
        }),
        query: query,
        count: searchResults.length,
        total_available: allSongs.length,
        timestamp: new Date().toISOString(),
        endpoint: "/search",
        version: "2.1"
      };

      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Error searching songs:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to perform search"
      });
    }
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    const response = {
      status: "online",
      timestamp: new Date().toISOString(),
      endpoints: [
        {
          path: "/random",
          description: "Get random NCS songs",
          parameters: [
            {
              name: "count",
              type: "number",
              description: "Number of random songs to return (default: 1, max: 50)",
              optional: true
            }
          ]
        },
        {
          path: "/search",
          description: "Search NCS songs",
          parameters: [
            {
              name: "q",
              type: "string",
              description: "Search query",
              required: true
            }
          ]
        }
      ],
      version: "2.1",
      server_duration: process.uptime() + " seconds" // Added server uptime duration
    };
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response, null, 2));
  });

  const httpServer = createServer(app);
  return httpServer;
}
