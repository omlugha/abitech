#!/usr/bin/env node

/**
 * NCS Song Fetcher CLI
 * Command-line interface for fetching and downloading NCS songs
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
            default:
                songs = await fetchTrendingSongs();
                break;
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

        // Ask user if they want to download the song
        const shouldDownload = process.env.DOWNLOAD_ENABLED === 'true' || args.includes('--download');
        
        if (shouldDownload && songData.download_url) {
            await handleDownload(songData);
        } else if (shouldDownload) {
            console.log('⚠️ Download requested but no download URL available');
        } else {
            console.log('💡 Tip: Add --download flag or set DOWNLOAD_ENABLED=true to download the song');
        }

        console.log('\n🎵 CLI execution completed successfully!');
        
    } catch (error) {
        console.error('\n❌ CLI Error:', error.message);
        process.exit(1);
    }
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

        // Generate filename
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
    console.log('  --download         Download the selected song');
    console.log('  --help            Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node cli.js');
    console.log('  node cli.js trending');
    console.log('  node cli.js trending --download');
    console.log('  node cli.js search "electronic music"');
    console.log('  node cli.js search "alan walker" --download');
    console.log('');
    console.log('Environment Variables:');
    console.log('  DOWNLOAD_ENABLED=true    Enable automatic downloading');
}

// Handle help command
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    displayHelp();
    process.exit(0);
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
main();
