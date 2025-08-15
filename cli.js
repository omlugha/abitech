#!/usr/bin/env node

/**
 * NCS Song Fetcher CLI
 * Command-line interface for fetching and downloading NCS songs
 * Compatible with Render (Background Worker) and Vercel (Serverless Function)
 * ES Modules (import/export) version
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

/**
 * Display help information
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
    console.log('  --download (-d)    Download the selected song');
    console.log('  --help (-h)        Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  DOWNLOAD_ENABLED=true    Enable automatic downloading');
    console.log('  DOWNLOAD_DIR=path       Custom download directory');
}

/**
 * Handle MP3 file download
 * @param {Object} songData - Formatted song data
 */
async function handleDownload(songData) {
    try {
        // Check if download directory is writable
        if (!checkDownloadDirectory()) {
            throw new Error('Download directory is not accessible');
        }

        // Generate filename (sanitize for filesystem)
        const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitize(songData.artist)}_${sanitize(songData.title)}.mp3`;
        
        console.log('⬇️ Starting MP3 download...');
        
        const downloadPath = await downloadMP3(
            songData.download_url, 
            filename, 
            process.env.DOWNLOAD_DIR || './downloads'
        );
        
        console.log(`🎵 Song downloaded successfully!`);
        console.log(`📂 Location: ${downloadPath}`);
        
    } catch (error) {
        console.error('❌ Download failed:', error.message);
        console.log('🔗 You can still use the stream URL to listen online');
    }
}

/**
 * Main CLI function
 */
async function main() {
    try {
        console.log('🎵 NCS Song Fetcher CLI');
        console.log('========================\n');

        // Parse command line arguments
        const args = process.argv.slice(2);
        const command = args[0];
        const query = args.slice(1).join(' ');

        let songs = [];

        // Handle different commands
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
            case undefined: // No command provided
            case null:
                songs = await fetchTrendingSongs();
                break;
                
            case '--help':
            case '-h':
                displayHelp();
                process.exit(0);
                break;
                
            default:
                console.error(`❌ Unknown command: ${command}`);
                displayHelp();
                process.exit(1);
        }

        // Select a random song
        const selectedSong = getRandomSong(songs);
        
        // Validate song has URLs
        if (!validateSongUrls(selectedSong)) {
            console.error('❌ Selected song has no valid URLs');
            process.exit(1);
        }

        // Format and display song information
        const songData = formatSongData(selectedSong);
        displaySongInfo(songData);

        // Check if download is requested
        const shouldDownload = process.env.DOWNLOAD_ENABLED === 'true' || 
                             args.includes('--download') ||
                             args.includes('-d');

        if (shouldDownload && songData.download_url) {
            await handleDownload(songData);
        } else if (shouldDownload) {
            console.log('⚠️ Download requested but no download URL available');
        } else {
            console.log('💡 Tip: Add --download flag or set DOWNLOAD_ENABLED=true to download the song');
        }

        console.log('\n🎵 CLI execution completed successfully!');
        
        // For Render Background Worker - exit cleanly
        if (process.env.RENDER) {
            process.exit(0);
        }
        
    } catch (error) {
        console.error('\n❌ CLI Error:', error.message);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('\n💥 Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

// Export for Vercel Serverless Function compatibility
export default async (req, res) => {
    if (req.method === 'POST') {
        // For Vercel - handle HTTP requests
        try {
            await main();
            res.status(200).send('CLI executed successfully');
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
