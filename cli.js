#!/usr/bin/env node

/**
 * NCS Song Fetcher CLI - Render Optimized
 * Maintains original functionality while working on Render
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

/**
 * Minimal Web Server for Render Compatibility
 */
function startHealthServer() {
    const app = express();
    const port = process.env.PORT || 3000;
    
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).send('OK');
    });
    
    return app.listen(port, () => {
        console.log(`⚡ Health server running on port ${port}`);
    });
}

/**
 * Main CLI function (original with slight Render adaptation)
 */
async function main() {
    // Start health server if on Render
    if (process.env.RENDER) {
        startHealthServer();
    }

    try {
        console.log('🎵 NCS Song Fetcher CLI');
        console.log('========================\n');

        // Original argument parsing
        const args = process.argv.slice(2);
        const command = args[0];
        const query = args.slice(1).join(' ');

        let songs = [];

        switch (command) {
            case 'search':
                if (!query) {
                    console.error('❌ Please provide a search query');
                    console.log('Usage: node cli.js search <query>');
                    process.exit(1);
                }
                songs = await searchSongs(query);
                if (songs.length === 0) {
                    console.log('🔍 No songs found for your search query');
                    process.exit(0);
                }
                break;
                
            case 'trending':
            default:
                songs = await fetchTrendingSongs();
                break;
        }

        const selectedSong = getRandomSong(songs);
        
        if (!validateSongUrls(selectedSong)) {
            console.error('❌ Selected song has no valid URLs');
            process.exit(1);
        }

        const songData = formatSongData(selectedSong);
        displaySongInfo(songData);

        const shouldDownload = process.env.DOWNLOAD_ENABLED === 'true' || args.includes('--download');
        
        if (shouldDownload && songData.download_url) {
            await handleDownload(songData);
        } else if (shouldDownload) {
            console.log('⚠️ Download requested but no download URL available');
        } else {
            console.log('💡 Tip: Add --download flag or set DOWNLOAD_ENABLED=true to download the song');
        }

        console.log('\n🎵 CLI execution completed successfully!');
        
        // Keep alive if on Render
        if (process.env.RENDER) {
            console.log('🌐 Process maintained for Render');
            setInterval(() => {}, 1000 * 60 * 5); // 5 minute keep-alive
        }
        
    } catch (error) {
        console.error('\n❌ CLI Error:', error.message);
        process.exit(1);
    }
}

/**
 * Original download handler (unchanged)
 */
async function handleDownload(songData) {
    try {
        if (!checkDownloadDirectory()) {
            throw new Error('Download directory is not accessible');
        }

        const filename = `${songData.artist} - ${songData.title}.mp3`;
        
        console.log('⬇️ Starting MP3 download...');
        
        const downloadPath = await downloadMP3(
            songData.download_url, 
            filename, 
            './downloads'
        );
        
        console.log(`🎵 Song downloaded successfully!`);
        console.log(`📂 Location: ${downloadPath}`);
        
    } catch (error) {
        console.error('❌ Download failed:', error.message);
        console.log('🔗 You can still use the stream URL to listen online');
    }
}

/**
 * Original help display (unchanged)
 */
function displayHelp() {
    console.log('🎵 NCS Song Fetcher CLI');
    console.log('========================');
    console.log('');
    console.log('Usage:');
    console.log('  node cli.js [command] [options]');
    console.log('');
    console.log('Commands:');
    console.log('  trending           Fetch trending NCS songs (default)');
    console.log('  search <query>     Search for specific songs');
    console.log('');
    console.log('Options:');
    console.log('  --download         Download the selected song');
    console.log('  --help            Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  DOWNLOAD_ENABLED=true    Enable automatic downloading');
}

// Original help command handling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    displayHelp();
    process.exit(0);
}

// Original error handlers
process.on('uncaughtException', (error) => {
    console.error('\n💥 Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
main();
