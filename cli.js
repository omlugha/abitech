#!/usr/bin/env node

/**
 * NCS Song Fetcher CLI - Render/Background Worker Version
 * This is optimized for Render's Background Worker service type
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

// Configuration
const DEFAULT_PAGES_TO_FETCH = 5;

/**
 * Display help information
 */
function displayHelp() {
    console.log('🎵 NCS Song Fetcher CLI');
    console.log('========================');
    console.log('\nUsage:');
    console.log('  node cli.js [command] [options]');
    console.log('\nCommands:');
    console.log('  trending           Fetch trending NCS songs (default)');
    console.log('  search <query>     Search for specific songs');
    console.log('\nOptions:');
    console.log('  --download (-d)    Download the selected song');
    console.log('  --pages <number>   Number of pages to fetch (default: 5)');
    console.log('  --help (-h)        Show this help message');
    console.log('\nEnvironment Variables:');
    console.log('  DOWNLOAD_ENABLED=true    Enable automatic downloading');
    console.log('  DOWNLOAD_DIR=path       Custom download directory');
}

/**
 * Handle MP3 file download
 */
async function handleDownload(songData) {
    try {
        if (!checkDownloadDirectory()) {
            throw new Error('Download directory not accessible');
        }

        const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitize(songData.artist)}_${sanitize(songData.title)}.mp3`;
        
        console.log('⬇️ Starting download...');
        const downloadPath = await downloadMP3(
            songData.download_url, 
            filename, 
            process.env.DOWNLOAD_DIR || './downloads'
        );
        
        console.log(`✅ Downloaded: ${downloadPath}`);
    } catch (error) {
        console.error('❌ Download failed:', error.message);
    }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        command: 'trending',
        query: '',
        download: false,
        pages: DEFAULT_PAGES_TO_FETCH
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case 'search':
                result.command = 'search';
                result.query = args.slice(i + 1).join(' ');
                return result;
            case 'trending':
                result.command = 'trending';
                break;
            case '--download':
            case '-d':
                result.download = true;
                break;
            case '--pages':
                result.pages = parseInt(args[i + 1]) || DEFAULT_PAGES_TO_FETCH;
                i++;
                break;
            case '--help':
            case '-h':
                displayHelp();
                process.exit(0);
        }
    }
    return result;
}

/**
 * Main execution function
 */
async function run() {
    try {
        console.log('🚀 Starting NCS Song Fetcher');
        const { command, query, download, pages } = parseArgs();

        // Fetch songs based on command
        const songs = command === 'search' 
            ? await searchSongs(query) 
            : await fetchTrendingSongs(pages);

        if (!songs.length) {
            console.log('🔍 No songs found');
            return;
        }

        // Select and display song
        const selectedSong = getRandomSong(songs);
        if (!validateSongUrls(selectedSong)) {
            throw new Error('Selected song has no valid URLs');
        }

        const songData = formatSongData(selectedSong);
        displaySongInfo(songData);

        // Handle download if requested
        const shouldDownload = download || process.env.DOWNLOAD_ENABLED === 'true';
        if (shouldDownload && songData.download_url) {
            await handleDownload(songData);
        }

        console.log('\n🎉 Operation completed successfully');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exitCode = 1;
    } finally {
        // Proper cleanup for Render
        if (process.env.RENDER) {
            console.log('🛑 Render Background Worker shutting down');
            process.exit(process.exitCode || 0);
        }
    }
}

// Error handlers
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    process.exit(1);
});

// Start the application
run();
