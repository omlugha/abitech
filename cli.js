#!/usr/bin/env node

/**
 * NCS Song Fetcher - Render Optimized Version
 * Works perfectly on Render without port warnings
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

// Configure paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
    PORT: process.env.PORT || 3000,
    RENDER: process.env.RENDER ? true : false,
    DOWNLOAD_ENABLED: process.env.DOWNLOAD_ENABLED === 'true'
};

/**
 * Core Application Logic
 */
async function fetchAndProcessSong() {
    try {
        console.log('🔍 Fetching NCS songs...');
        const songs = await fetchTrendingSongs(5);
        const song = getRandomSong(songs);
        
        if (!validateSongUrls(song)) {
            throw new Error('Invalid song URLs');
        }

        const formatted = formatSongData(song);
        console.log('🎵 Selected Song:', formatted.title);

        if (config.DOWNLOAD_ENABLED && formatted.download_url) {
            const filename = `${formatted.artist.replace(/\W+/g, '_')}_${formatted.title.replace(/\W+/g, '_')}.mp3`;
            const filePath = await downloadMP3(
                formatted.download_url,
                filename,
                './downloads'
            );
            console.log('💾 Saved to:', filePath);
        }

        return formatted;
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

/**
 * Minimal Web Server for Render Compatibility
 */
function startHealthCheckServer() {
    const app = express();
    
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            service: 'ncs-fetcher',
            timestamp: new Date().toISOString()
        });
    });

    // Serve basic HTML if present
    app.use(express.static(__dirname));

    return app.listen(config.PORT, () => {
        console.log(`🖥️  Health check server running on port ${config.PORT}`);
    });
}

/**
 * Main Execution Flow
 */
async function main() {
    // Start minimal web server if on Render
    let server;
    if (config.RENDER) {
        server = startHealthCheckServer();
    }

    try {
        // Run main application logic
        await fetchAndProcessSong();
        console.log('✅ Operation completed successfully');

        // Keep alive if on Render
        if (config.RENDER) {
            console.log('🌐 Process maintained for Render');
            setInterval(() => {}, 1000 * 60 * 5); // 5 minute keep-alive
        }
    } catch (error) {
        console.error('💥 Application failed:', error.message);
        process.exit(1);
    }
}

// Start the application
main();

// Cleanup handlers
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM - shutting down gracefully');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err.message);
    process.exit(1);
});
