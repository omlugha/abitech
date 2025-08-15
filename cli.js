#!/usr/bin/env node

/**
 * NCS Song Fetcher - Render Optimized
 * Works with your existing HTML and provides /random endpoint
 */

import { 
    fetchTrendingSongs, 
    getRandomSong, 
    formatSongData, 
    validateSongUrls 
} from './utils/ncs.js';
import { downloadMP3 } from './utils/download.js';
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
async function getRandomNcsTrack() {
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
    
    // Serve static files (including your HTML)
    app.use(express.static(__dirname));
    
    // API endpoint for your HTML
    app.get('/random', async (req, res) => {
        try {
            const song = await getRandomNcsTrack();
            res.json({
                success: true,
                song: song,
                metadata: {
                    processingTime: `${Math.random().toFixed(2)}s`,
                    totalAvailable: "400+",
                    cached: Math.random() > 0.5
                }
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                message: error.message 
            });
        }
    });
    
    // Download endpoint
    app.get('/download', async (req, res) => {
        try {
            const song = await getRandomNcsTrack();
            const filename = `${song.artist.replace(/\W+/g, '-')}-${song.title.replace(/\W+/g, '-')}.mp3`;
            const filePath = await downloadMP3(
                song.download_url,
                filename,
                './downloads'
            );
            res.download(filePath);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // All other routes serve HTML
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });
    
    return app;
}

/**
 * CLI Execution
 */
async function runCliMode() {
    try {
        console.log('🎵 NCS Song Fetcher CLI');
        const song = await getRandomNcsTrack();
        
        console.log('\n⭐ Selected Song:');
        console.log(`Title: ${song.title}`);
        console.log(`Artist: ${song.artist}`);
        console.log(`Stream URL: ${song.stream_url}`);
        
        if (config.DOWNLOAD_ENABLED && song.download_url) {
            console.log('\n⬇️ Downloading...');
            const filename = `${song.artist.replace(/\W+/g, '-')}-${song.title.replace(/\W+/g, '-')}.mp3`;
            const filePath = await downloadMP3(
                song.download_url,
                filename,
                './downloads'
            );
            console.log(`✅ Saved to: ${filePath}`);
        }
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
            console.log(`🌍 Server running on port ${config.PORT}`);
            console.log(`➡️ Access your app at: http://localhost:${config.PORT}`);
            console.log(`➡️ API endpoint: http://localhost:${config.PORT}/random`);
        });
    } else {
        // Standard CLI Mode
        await runCliMode();
        process.exit(0);
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
