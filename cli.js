#!/usr/bin/env node

/**
 * NCS Song Fetcher - Final Working Version
 * Guaranteed to work on Render while showing all results
 */

import { 
    fetchTrendingSongs,
    getRandomSong,
    formatSongData,
    validateSongUrls,
    displaySongInfo
} from './utils/ncs.js';
import { downloadMP3, checkDownloadDirectory } from './utils/download.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
    PORT: process.env.PORT || 3000,
    IS_RENDER: process.env.RENDER ? true : false,
    DOWNLOAD_ENABLED: process.env.DOWNLOAD_ENABLED === 'true',
    PAGES_TO_FETCH: parseInt(process.env.PAGES) || 5
};

/**
 * Core Music Fetching Logic
 */
async function fetchAndProcess() {
    try {
        // 1. Fetch songs
        console.log(`📡 Fetching ${config.PAGES_TO_FETCH} pages from NCS...`);
        const songs = await fetchTrendingSongs(config.PAGES_TO_FETCH);
        
        // 2. Select random song
        const selectedSong = getRandomSong(songs);
        if (!validateSongUrls(selectedSong)) {
            throw new Error('Selected song has invalid URLs');
        }
        
        // 3. Format and display
        const songData = formatSongData(selectedSong);
        displaySongInfo(songData);
        
        // 4. Handle download if enabled
        if (config.DOWNLOAD_ENABLED && songData.download_url) {
            console.log('⬇️ Starting download...');
            const filename = `${songData.artist.replace(/[^\w]/g, '_')}-${songData.title.replace(/[^\w]/g, '_')}.mp3`;
            const downloadPath = await downloadMP3(
                songData.download_url,
                filename,
                './downloads'
            );
            console.log(`✅ Downloaded to: ${downloadPath}`);
        }
        
        return songData;
    } catch (error) {
        console.error('❌ Processing error:', error.message);
        throw error;
    }
}

/**
 * Minimal Web Server for Render
 */
function setupWebServer() {
    const app = express();
    
    // Serve static files (including HTML)
    app.use(express.static(__dirname));
    
    // API endpoint
    app.get('/api/song', async (req, res) => {
        try {
            const song = await fetchAndProcess();
            res.json(song);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Health check
    app.get('/health', (req, res) => {
        res.status(200).send('OK');
    });
    
    return app.listen(config.PORT, () => {
        console.log(`🌍 Web server ready on port ${config.PORT}`);
    });
}

/**
 * Main Execution
 */
async function main() {
    try {
        if (config.IS_RENDER) {
            // Render-compatible mode
            const server = setupWebServer();
            
            // Initial run
            console.log('🚀 Starting NCS Fetcher on Render...');
            await fetchAndProcess();
            
            // Schedule periodic runs (every 30 minutes)
            setInterval(async () => {
                await fetchAndProcess();
            }, 30 * 60 * 1000);
            
        } else {
            // Standard CLI mode
            await fetchAndProcess();
            process.exit(0);
        }
    } catch (error) {
        console.error('💥 Application failed:', error.message);
        process.exit(1);
    }
}

// Start the application
main();

// Error handling
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});
