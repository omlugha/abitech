#!/usr/bin/env node

/**
 * NCS Song Fetcher - Universal Version
 * Works as both CLI and web server with HTML interface
 */

import { 
    fetchTrendingSongs, 
    searchSongs, 
    getRandomSong, 
    formatSongData, 
    validateSongUrls 
} from './utils/ncs.js';
import { downloadMP3, checkDownloadDirectory } from './utils/download.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
    PORT: process.env.PORT || 3000,
    WEB_MODE: process.env.WEB_MODE === 'true',
    DOWNLOAD_ENABLED: process.env.DOWNLOAD_ENABLED === 'true',
    DOWNLOAD_DIR: process.env.DOWNLOAD_DIR || './downloads',
    KEEP_ALIVE: process.env.RENDER ? true : false
};

/**
 * Core Song Fetching Logic
 */
async function getRandomNcsSong(options = {}) {
    const { pages = 5, query = '' } = options;
    
    const songs = query 
        ? await searchSongs(query)
        : await fetchTrendingSongs(pages);

    if (!songs.length) throw new Error('No songs found');
    
    const song = getRandomSong(songs);
    if (!validateSongUrls(song)) throw new Error('Invalid song URLs');
    
    return formatSongData(song);
}

/**
 * CLI-Specific Functions
 */
async function runCliMode() {
    try {
        console.log('🎵 NCS Song Fetcher - CLI Mode');
        
        const song = await getRandomNcsSong({ pages: 5 });
        console.log('\n⭐ Selected Song:');
        console.log(`Title: ${song.title}`);
        console.log(`Artist: ${song.artist}`);
        console.log(`Stream: ${song.stream_url}`);
        
        if (config.DOWNLOAD_ENABLED && song.download_url) {
            console.log('\n⬇️ Starting download...');
            const filename = `${song.artist.replace(/[^\w]/g, '_')}_${song.title.replace(/[^\w]/g, '_')}.mp3`;
            const filePath = await downloadMP3(
                song.download_url,
                filename,
                config.DOWNLOAD_DIR
            );
            console.log(`✅ Saved to: ${filePath}`);
        }

        console.log('\n🎉 Operation completed');
        
        // Keep alive if running on Render in CLI mode
        if (config.KEEP_ALIVE) {
            console.log('🌐 Process kept alive for Render');
            setInterval(() => {}, 1000);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * Web Server Setup
 */
function setupWebServer() {
    const app = express();
    
    // Serve static files (including your HTML)
    app.use(express.static(__dirname));
    
    // API Endpoints
    app.get('/api/song', async (req, res) => {
        try {
            const song = await getRandomNcsSong();
            res.json(song);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    app.get('/api/download', async (req, res) => {
        try {
            const song = await getRandomNcsSong();
            const filename = `${song.artist.replace(/[^\w]/g, '_')}_${song.title.replace(/[^\w]/g, '_')}.mp3`;
            const filePath = await downloadMP3(
                song.download_url,
                filename,
                config.DOWNLOAD_DIR
            );
            res.download(filePath);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // All other routes serve the HTML file
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });
    
    return app;
}

/**
 * Start the appropriate mode
 */
if (config.WEB_MODE) {
    // Web Server Mode
    const app = setupWebServer();
    app.listen(config.PORT, () => {
        console.log(`🌍 Web server running on port ${config.PORT}`);
        console.log(`➡️ Access the interface at http://localhost:${config.PORT}`);
    });
} else {
    // CLI Mode
    runCliMode();
}

// Error Handling
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});
