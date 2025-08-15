#!/usr/bin/env node

/**
 * NCS Song Fetcher - Full Render Solution
 * Works as both CLI and web service with proper HTML serving
 */

import { 
    fetchTrendingSongs, 
    searchSongs, 
    getRandomSong, 
    formatSongData, 
    displaySongInfo,
    validateSongUrls 
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
    DOWNLOAD_ENABLED: process.env.DOWNLOAD_ENABLED === 'true'
};

/**
 * Core Music Functions
 */
async function fetchRandomSong() {
    const songs = await fetchTrendingSongs();
    const song = getRandomSong(songs);
    if (!validateSongUrls(song)) throw new Error('Invalid song URLs');
    return formatSongData(song);
}

/**
 * Web Server Setup
 */
function setupWebServer() {
    const app = express();
    
    // Serve static files from the root directory
    app.use(express.static(__dirname));
    
    // Explicit HTML route handler
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'), {
            headers: {
                'Content-Type': 'text/html'
            }
        });
    });
    
    // API endpoint
    app.get('/api/song', async (req, res) => {
        try {
            const song = await fetchRandomSong();
            res.json(song);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Health check
    app.get('/health', (req, res) => {
        res.status(200).send('OK');
    });
    
    return app;
}

/**
 * CLI Execution
 */
async function runCliMode() {
    try {
        console.log('🎵 NCS Song Fetcher CLI');
        
        const song = await fetchRandomSong();
        displaySongInfo(song);
        
        if (config.DOWNLOAD_ENABLED && song.download_url) {
            console.log('\n⬇️ Starting download...');
            const filename = `${song.artist.replace(/[^\w]/g, '_')}_${song.title.replace(/[^\w]/g, '_')}.mp3`;
            const filePath = await downloadMP3(
                song.download_url,
                filename,
                './downloads'
            );
            console.log(`✅ Downloaded to: ${filePath}`);
        }
        
        console.log('\n🎉 Operation completed');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * Main Application Flow
 */
async function main() {
    if (config.IS_RENDER) {
        // Web Mode on Render
        const app = setupWebServer();
        app.listen(config.PORT, () => {
            console.log(`🌍 Web server running on port ${config.PORT}`);
            console.log(`➡️ Access your app at: http://localhost:${config.PORT}`);
        });
    } else {
        // Standard CLI Mode
        await runCliMode();
    }
}

// Error Handling
process.on('uncaughtException', (err) => {
    console.error('💥 Critical Error:', err.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});

// Start the application
main();
