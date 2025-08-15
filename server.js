/**
 * BWM XMD Random Songs API Server
 * Provides random NCS songs with thumbnails
 */

import express from 'express';
import { 
    fetchTrendingSongs, 
    fetchAllTimeBestSongs,
    getRandomSong,
    getMultipleRandomSongs, 
    formatSongData,
    validateSongUrls
} from './utils/ncs.js';

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for cross-origin requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Cache for trending songs (to make /random endpoint faster)
let cachedTrendingSongs = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for all-time best songs
let cachedAllTimeBestSongs = [];
let allTimeCacheTimestamp = 0;
const ALL_TIME_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (longer cache for all-time songs)

/**
 * Get cached trending songs or fetch new ones
 */
async function getCachedTrendingSongs() {
    const now = Date.now();
    
    // Check if cache is still valid
    if (cachedTrendingSongs.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
        return cachedTrendingSongs;
    }
    
    // Fetch new trending songs
    try {
        cachedTrendingSongs = await fetchTrendingSongs();
        cacheTimestamp = now;
        return cachedTrendingSongs;
    } catch (error) {
        // If fetch fails but we have old cache, use it
        if (cachedTrendingSongs.length > 0) {
            console.log('⚠️ Using stale cache due to fetch error:', error.message);
            return cachedTrendingSongs;
        }
        throw error;
    }
}

/**
 * Get cached all-time best songs or fetch new ones
 */
async function getCachedAllTimeBestSongs() {
    const now = Date.now();
    
    // Check if cache is still valid
    if (cachedAllTimeBestSongs.length > 0 && (now - allTimeCacheTimestamp) < ALL_TIME_CACHE_DURATION) {
        return cachedAllTimeBestSongs;
    }
    
    // Fetch new all-time best songs (5 pages to get variety)
    try {
        cachedAllTimeBestSongs = await fetchAllTimeBestSongs(5);
        allTimeCacheTimestamp = now;
        return cachedAllTimeBestSongs;
    } catch (error) {
        // If fetch fails but we have old cache, use it
        if (cachedAllTimeBestSongs.length > 0) {
            console.log('⚠️ Using stale all-time cache due to fetch error:', error.message);
            return cachedAllTimeBestSongs;
        }
        throw error;
    }
}

/**
 * Root endpoint - Serve HTML test page
 */
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
});

/**
 * API info endpoint
 */
app.get('/api', (req, res) => {
    res.json({
        message: 'BWM XMD Random Songs API',
        version: '1.0.0',
        endpoint: '/random',
        description: 'Get random NCS songs with thumbnails and download links',
        usage: 'GET /random'
    });
});

/**
 * Simple random song endpoint
 * Returns a random song from both trending and all-time best songs
 */
app.get('/random', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Get both trending and all-time best songs
        const trendingSongs = await getCachedTrendingSongs();
        const allTimeSongs = await getCachedAllTimeBestSongs();
        
        // Combine both song pools
        const allSongs = [...trendingSongs, ...allTimeSongs];
        
        if (allSongs.length === 0) {
            return res.status(404).json({
                error: 'No songs available',
                message: 'Unable to fetch songs at this time'
            });
        }
        
        // Select one random song from combined pool
        const randomSong = getRandomSong(allSongs);
        
        // Validate song has URLs
        if (!validateSongUrls(randomSong)) {
            // Try another random song
            const anotherSong = getRandomSong(allSongs);
            if (!validateSongUrls(anotherSong)) {
                return res.status(500).json({
                    error: 'Invalid song data',
                    message: 'Selected song does not have valid URLs'
                });
            }
        }
        
        // Format song data
        const songData = formatSongData(randomSong);
        
        const processingTime = Date.now() - startTime;
        
        // Format response with proper indentation
        const response = {
            success: true,
            song: songData,
            metadata: {
                source: 'trending + all-time best',
                totalAvailable: allSongs.length,
                processingTime: `${processingTime}ms`,
                cached: true
            }
        };
        
        res.set('Content-Type', 'application/json');
        res.send(JSON.stringify(response, null, 2));
        
    } catch (error) {
        console.error('❌ /random endpoint error:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
    try {
        // Quick test to see if we can fetch songs
        const trendingSongs = await getCachedTrendingSongs();
        const allTimeSongs = await getCachedAllTimeBestSongs();
        
        const response = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            caches: {
                trending: {
                    songsCount: cachedTrendingSongs.length,
                    lastUpdated: new Date(cacheTimestamp).toISOString(),
                    isValid: (Date.now() - cacheTimestamp) < CACHE_DURATION,
                    cacheDuration: `${CACHE_DURATION / 1000 / 60} minutes`
                },
                allTime: {
                    songsCount: cachedAllTimeBestSongs.length,
                    lastUpdated: new Date(allTimeCacheTimestamp).toISOString(),
                    isValid: (Date.now() - allTimeCacheTimestamp) < ALL_TIME_CACHE_DURATION,
                    cacheDuration: `${ALL_TIME_CACHE_DURATION / 1000 / 60} minutes`
                }
            },
            endpoints: {
                '/random': 'Get random trending song',
                '/random?count=N': 'Get N random songs (1-10)',
                '/random?type=alltime': 'Get random all-time best song',
                '/random?count=N&type=alltime': 'Get N random all-time best songs'
            }
        };
        
        res.set('Content-Type', 'application/json');
        res.send(JSON.stringify(response, null, 2));
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 404 handler for unknown endpoints
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.path} does not exist`,
        availableEndpoints: ['/random', '/health']
    });
});

/**
 * Global error handler
 */
app.use((error, req, res, next) => {
    console.error('💥 Unhandled server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

/**
 * Start the server
 */
async function startServer() {
    try {
        // Pre-populate caches on startup
        console.log('🎵 Starting BWM XMD Random Songs API Server...');
        console.log('📦 Pre-loading trending songs cache...');
        
        await getCachedTrendingSongs();
        console.log('✅ Trending cache pre-loaded successfully');
        
        console.log('📦 Pre-loading all-time best songs cache...');
        await getCachedAllTimeBestSongs();
        console.log('✅ All-time best cache pre-loaded successfully');
        
        // Start listening
        app.listen(PORT, HOST, () => {
            console.log(`🚀 Server running at http://${HOST}:${PORT}`);
            console.log('📖 Available endpoints:');
            console.log(`   GET  http://${HOST}:${PORT}/          - BWM XMD Random Songs page`);
            console.log(`   GET  http://${HOST}:${PORT}/random    - Random song from all NCS tracks`);
            console.log(`   GET  http://${HOST}:${PORT}/health    - Health check`);
        });
        
    } catch (error) {
        console.error('💥 Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n📴 Received SIGINT, shutting down gracefully');
    process.exit(0);
});

// Start the server
startServer();