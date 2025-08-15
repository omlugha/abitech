#!/usr/bin/env node

/**
 * NCS Song Fetcher - Render-Compatible Version
 * Works as both CLI and persistent worker
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
const KEEP_ALIVE = process.env.RENDER ? true : false;
const DEFAULT_PAGES = 5;

/**
 * Display help information
 */
function showHelp() {
    console.log(`
🎵 NCS Song Fetcher - Render Edition
================================

Usage:
  node cli.js [command] [options]

Commands:
  trending           Fetch trending songs (default)
  search <query>     Search for specific songs

Options:
  --download (-d)    Download the selected song
  --pages <number>   Number of pages to fetch (default: ${DEFAULT_PAGES})
  --interval <mins>  Run repeatedly (for Render, default: 0 = run once)
  --help (-h)        Show this help

Env Vars:
  DOWNLOAD_ENABLED   Set to 'true' to enable downloads
  DOWNLOAD_DIR       Custom download directory
    `);
}

/**
 * Main application logic
 */
async function fetchAndProcess(options) {
    try {
        console.log('🔍 Fetching songs...');
        
        const songs = options.query 
            ? await searchSongs(options.query)
            : await fetchTrendingSongs(options.pages);

        if (!songs.length) {
            console.log('❌ No songs found');
            return;
        }

        const song = getRandomSong(songs);
        if (!validateSongUrls(song)) {
            throw new Error('Invalid song URLs');
        }

        const songInfo = formatSongData(song);
        displaySongInfo(songInfo);

        if (options.download && songInfo.download_url) {
            await handleDownload(songInfo);
        }

        console.log('✅ Operation completed');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Handle file download
 */
async function handleDownload(songData) {
    const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitize(songData.artist)}_${sanitize(songData.title)}.mp3`;
    
    console.log(`⬇️ Downloading ${filename}...`);
    await downloadMP3(
        songData.download_url,
        filename,
        process.env.DOWNLOAD_DIR || './downloads'
    );
    console.log('📥 Download complete');
}

/**
 * Parse command line arguments
 */
function parseOptions() {
    const args = process.argv.slice(2);
    const options = {
        command: 'trending',
        query: '',
        download: process.env.DOWNLOAD_ENABLED === 'true',
        pages: DEFAULT_PAGES,
        interval: 0
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case 'search':
                options.query = args.slice(i + 1).join(' ');
                return options;
            case '--download':
            case '-d':
                options.download = true;
                break;
            case '--pages':
                options.pages = parseInt(args[++i]) || DEFAULT_PAGES;
                break;
            case '--interval':
                options.interval = parseInt(args[++i]) || 0;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
        }
    }
    return options;
}

/**
 * Run the application with proper Render compatibility
 */
async function run() {
    const options = parseOptions();
    
    if (options.interval > 0) {
        // Continuous mode for Render
        console.log(`🔄 Running every ${options.interval} minutes`);
        const intervalMs = options.interval * 60 * 1000;
        
        const runInterval = async () => {
            await fetchAndProcess(options);
            console.log(`⏳ Next run in ${options.interval} minutes...`);
        };

        // Immediate first run
        await runInterval();
        
        // Set up periodic execution
        setInterval(runInterval, intervalMs);
    } else {
        // Single run mode
        await fetchAndProcess(options);
        
        if (KEEP_ALIVE) {
            // Keep process alive for Render
            console.log('🌐 Process kept alive for Render');
            setInterval(() => {}, 60000); // Empty interval to keep alive
        } else {
            process.exit(0);
        }
    }
}

// Error handling
process.on('uncaughtException', (err) => {
    console.error('💥 Critical Error:', err.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});

// Start the application
run();
