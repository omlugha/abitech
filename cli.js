#!/usr/bin/env node

/**
 * NCS Song Fetcher - Enhanced Version
 * Maintains original CLI functionality while adding web support for Render
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
 * Core Music Functions (Original)
 */
async function fetchAndProcessSongs(options = {}) {
    let songs = [];
    
    if (options.query) {
        songs = await searchSongs(options.query);
        if (songs.length === 0) {
            throw new Error('No songs found for your search query');
        }
    } else {
        songs = await fetchTrendingSongs();
    }

    const selectedSong = getRandomSong(songs);
    
    if (!validateSongUrls(selectedSong)) {
        throw new Error('Selected song has no valid URLs');
    }

    const songData = formatSongData(selectedSong);
    displaySongInfo(songData);

    if (options.shouldDownload && songData.download_url) {
        await handleDownload(songData);
    }

    return songData;
}

/**
 * Download Handler (Original)
 */
async function handleDownload(songData) {
    if (!checkDownloadDirectory()) {
        throw new Error('Download directory is not accessible');
    }

    const filename = `${songData.artist} - ${songData.title}.mp3`;
    const downloadPath = await downloadMP3(
        songData.download_url, 
        filename, 
        './downloads'
    );
    
    return downloadPath;
}

/**
 * Web Server Setup for Render
 */
function setupWebServer() {
    const app = express();
    
    // Serve static files (including your HTML)
    app.use(express.static(__dirname));
    
    // API endpoint that matches your HTML expectations
    app.get('/random', async (req, res) => {
        try {
            const songData = await fetchAndProcessSongs();
            res.json({
                success: true,
                song: {
                    title: songData.title,
                    artist: songData.artist,
                    genre: songData.genre || 'Unknown',
                    stream_url: songData.stream_url,
                    download_url: songData.download_url,
                    cover_url: songData.cover_url || ''
                },
                metadata: {
                    processingTime: "0.5s",
                    totalAvailable: "400+",
                    cached: false
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
            const songData = await fetchAndProcessSongs({ shouldDownload: true });
            const filename = `${songData.artist.replace(/[^\w]/g, '_')}_${songData.title.replace(/[^\w]/g, '_')}.mp3`;
            res.download(path.join('./downloads', filename));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // CLI-style execution via HTTP
    app.get('/cli', async (req, res) => {
        try {
            const songData = await fetchAndProcessSongs({
                query: req.query.search,
                shouldDownload: req.query.download === 'true'
            });
            res.send(`
                <pre>
                🎵 Song fetched successfully!
                Title: ${songData.title}
                Artist: ${songData.artist}
                Stream URL: ${songData.stream_url}
                ${req.query.download === 'true' ? `Downloaded to: downloads/${songData.artist} - ${songData.title}.mp3` : ''}
                </pre>
            `);
        } catch (error) {
            res.status(500).send(`<pre>❌ Error: ${error.message}</pre>`);
        }
    });
    
    // All other routes serve HTML
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });
    
    return app;
}

/**
 * CLI Execution (Original)
 */
async function runCliMode() {
    try {
        console.log('🎵 NCS Song Fetcher CLI');
        console.log('========================\n');

        const args = process.argv.slice(2);
        const command = args[0];
        const query = args.slice(1).join(' ');

        const options = {
            query: command === 'search' ? query : null,
            shouldDownload: process.env.DOWNLOAD_ENABLED === 'true' || args.includes('--download')
        };

        await fetchAndProcessSongs(options);
        console.log('\n🎵 CLI execution completed successfully!');
    } catch (error) {
        console.error('\n❌ CLI Error:', error.message);
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
        const server = app.listen(config.PORT, () => {
            console.log(`🌍 Web server running on port ${config.PORT}`);
            console.log(`➡️ Access your app at: http://localhost:${config.PORT}`);
            console.log(`➡️ API endpoint: http://localhost:${config.PORT}/random`);
            
            // Also run CLI mode once on startup
            runCliMode().catch(console.error);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });
    } else {
        // Standard CLI Mode
        await runCliMode();
        process.exit(0);
    }
}

// Original help display
function displayHelp() {
    console.log('🎵 NCS Song Fetcher CLI');
    console.log('========================');
    console.log('\nUsage:');
    console.log('  node cli.js [command] [options]');
    console.log('\nCommands:');
    console.log('  trending           Fetch trending NCS songs (default)');
    console.log('  search <query>     Search for specific songs');
    console.log('\nOptions:');
    console.log('  --download         Download the selected song');
    console.log('  --help             Show this help message');
    console.log('\nEnvironment Variables:');
    console.log('  DOWNLOAD_ENABLED=true    Enable automatic downloading');
}

// Handle help command
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    displayHelp();
    process.exit(0);
}

// Error Handling
process.on('uncaughtException', (err) => {
    console.error('\n💥 Uncaught Exception:', err.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('\n⚠️ Unhandled Rejection:', reason);
});

// Start the application
main();
