/**
 * NCS (NoCopyrightSounds) utility functions
 * Handles fetching and processing NCS music data
 */

import pkg from 'nocopyrightsounds-api';
const { getSongs, search: searchNCS } = pkg;

/**
 * Fetch trending NCS songs from multiple pages
 * @param {number} maxPages - Maximum number of pages to fetch (default 20)
 * @returns {Promise<Array>} Array of trending songs
 */
export async function fetchTrendingSongs(maxPages = 20) {
    try {
        console.log(`🎵 Fetching trending NCS songs from ${maxPages} pages...`);
        const allSongs = [];
        
        for (let page = 1; page <= maxPages; page++) {
            try {
                const songs = await getSongs(page);
                if (songs && songs.length > 0) {
                    allSongs.push(...songs);
                    console.log(`📄 Trending page ${page}: Found ${songs.length} songs`);
                } else {
                    console.log(`📄 Trending page ${page}: No more songs, stopping`);
                    break;
                }
                
                // Small delay between requests to avoid rate limiting
                if (page < maxPages) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.warn(`⚠️ Failed to fetch trending page ${page}: ${error.message}`);
                if (page === 1) {
                    // If first page fails, throw error
                    throw error;
                }
                // If later pages fail, continue with what we have
                break;
            }
        }
        
        if (allSongs.length === 0) {
            throw new Error('No trending songs found');
        }
        
        console.log(`✅ Found total ${allSongs.length} trending songs from ${maxPages} pages`);
        return allSongs;
    } catch (error) {
        console.error('❌ Error fetching trending songs:', error.message);
        throw new Error(`Failed to fetch trending songs: ${error.message}`);
    }
}

/**
 * Fetch multiple pages of NCS songs to get thousands of all-time popular songs
 * @param {number} maxPages - Maximum number of pages to fetch (default 50)
 * @returns {Promise<Array>} Array of songs from multiple pages
 */
export async function fetchAllTimeBestSongs(maxPages = 50) {
    try {
        console.log(`🎵 Fetching best NCS songs from ${maxPages} pages...`);
        const allSongs = [];
        
        for (let page = 21; page <= maxPages + 20; page++) { // Start from page 21 to get different songs than trending
            try {
                const songs = await getSongs(page);
                if (songs && songs.length > 0) {
                    allSongs.push(...songs);
                    console.log(`📄 All-time page ${page}: Found ${songs.length} songs`);
                } else {
                    console.log(`📄 All-time page ${page}: No more songs, stopping`);
                    break;
                }
                
                // Small delay between requests to avoid rate limiting
                if (page < maxPages + 20) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.warn(`⚠️ Failed to fetch all-time page ${page}: ${error.message}`);
                break;
            }
        }
        
        if (allSongs.length === 0) {
            throw new Error('No songs found from any page');
        }
        
        console.log(`✅ Found total ${allSongs.length} all-time best songs from ${maxPages} pages`);
        return allSongs;
    } catch (error) {
        console.error('❌ Error fetching all-time best songs:', error.message);
        throw new Error(`Failed to fetch all-time best songs: ${error.message}`);
    }
}

/**
 * Search for NCS songs by query
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching songs
 */
export async function searchSongs(query) {
    try {
        if (!query || query.trim() === '') {
            throw new Error('Search query cannot be empty');
        }
        
        console.log(`🔍 Searching NCS songs for: "${query}"`);
        
        // Try API search first
        let songs = [];
        try {
            songs = await searchNCS(query.trim());
        } catch (apiError) {
            console.log('⚠️ API search failed, using local search in trending songs');
        }
        
        // If API search returns no results, search within trending songs
        if (!songs || songs.length === 0) {
            console.log(`⚠️ No API results for "${query}", searching in trending songs...`);
            const trendingSongs = await fetchTrendingSongs();
            songs = searchInSongs(trendingSongs, query.trim());
        }
        
        if (!songs || songs.length === 0) {
            console.log(`⚠️ No songs found for query: "${query}"`);
            return [];
        }
        
        console.log(`✅ Found ${songs.length} songs matching: "${query}"`);
        return songs;
    } catch (error) {
        console.error('❌ Error searching songs:', error.message);
        throw new Error(`Failed to search songs: ${error.message}`);
    }
}

/**
 * Get a random song from an array of songs, prioritizing most popular/viewed songs
 * @param {Array} songs - Array of songs (should be trending, already sorted by popularity)
 * @returns {Object} Random song object
 */
export function getRandomSong(songs) {
    if (!songs || songs.length === 0) {
        throw new Error('No songs available for random selection');
    }
    
    // Prioritize top trending songs (first 60% of the list)
    // and create weighted selection favoring popular songs
    const totalSongs = songs.length;
    const topTrendingCount = Math.ceil(totalSongs * 0.6); // Top 60% of trending songs
    
    // Create weighted selection pool
    let selectedSong;
    const random = Math.random();
    
    if (random < 0.7) {
        // 70% chance to pick from top trending songs (first 60% of list)
        const topSongs = songs.slice(0, topTrendingCount);
        const randomIndex = Math.floor(Math.random() * topSongs.length);
        selectedSong = topSongs[randomIndex];
        console.log(`🔥 Selected from TOP trending: "${selectedSong.name || selectedSong.title}" by ${selectedSong.artists?.[0]?.name || selectedSong.artist}`);
    } else if (random < 0.9) {
        // 20% chance to pick from top 80% of trending songs
        const popularCount = Math.ceil(totalSongs * 0.8);
        const popularSongs = songs.slice(0, popularCount);
        const randomIndex = Math.floor(Math.random() * popularSongs.length);
        selectedSong = popularSongs[randomIndex];
        console.log(`⭐ Selected from popular trending: "${selectedSong.name || selectedSong.title}" by ${selectedSong.artists?.[0]?.name || selectedSong.artist}`);
    } else {
        // 10% chance to pick from any song in the list
        const randomIndex = Math.floor(Math.random() * totalSongs);
        selectedSong = songs[randomIndex];
        console.log(`🎲 Selected random song: "${selectedSong.name || selectedSong.title}" by ${selectedSong.artists?.[0]?.name || selectedSong.artist}`);
    }
    
    return selectedSong;
}

/**
 * Get multiple random songs from an array of songs
 * @param {Array} songs - Array of songs
 * @param {number} count - Number of random songs to return (default 3, max 10)
 * @returns {Array} Array of random song objects
 */
export function getMultipleRandomSongs(songs, count = 3) {
    if (!songs || songs.length === 0) {
        throw new Error('No songs available for random selection');
    }
    
    const maxCount = Math.min(count, 10, songs.length); // Max 10 songs or available songs
    const selectedSongs = [];
    const usedIndices = new Set();
    
    console.log(`🎲 Selecting ${maxCount} random songs from ${songs.length} available songs`);
    
    for (let i = 0; i < maxCount; i++) {
        let selectedSong;
        let attempts = 0;
        
        // Try to get a unique song (avoid duplicates)
        do {
            selectedSong = getRandomSong(songs);
            attempts++;
        } while (selectedSongs.some(s => s.name === selectedSong.name) && attempts < 10);
        
        selectedSongs.push(selectedSong);
    }
    
    console.log(`✅ Selected ${selectedSongs.length} random songs`);
    return selectedSongs;
}

/**
 * Format song data for consistent output
 * @param {Object} song - Song object from NCS API
 * @returns {Object} Formatted song data
 */
export function formatSongData(song) {
    try {
        // Extract URLs from the song object (NCS API structure)
        const streamUrl = song.previewUrl || song.streamUrl || song.stream || null;
        const downloadUrl = song.download?.regular || song.downloadUrl || song.download || streamUrl || null;
        
        // Extract artist names from artists array
        const artistNames = song.artists && Array.isArray(song.artists) 
            ? song.artists.map(artist => artist.name).join(', ')
            : (song.artist || 'Unknown Artist');
        
        return {
            title: song.name || song.title || 'Unknown Title',
            artist: artistNames,
            stream_url: streamUrl,
            download_url: downloadUrl,
            genre: song.genre || 'Unknown',
            mood: song.mood || 'Unknown',
            duration: song.duration || 'Unknown',
            release_date: song.date || song.releaseDate || 'Unknown',
            cover_url: song.coverUrl || null,
            tags: song.tags || []
        };
    } catch (error) {
        console.error('❌ Error formatting song data:', error.message);
        throw new Error(`Failed to format song data: ${error.message}`);
    }
}

/**
 * Display song information in a formatted way
 * @param {Object} songData - Formatted song data
 */
export function displaySongInfo(songData) {
    console.log('\n🎵 ===== SONG INFORMATION =====');
    console.log(`📝 Title: ${songData.title}`);
    console.log(`🎤 Artist: ${songData.artist}`);
    console.log(`🎶 Genre: ${songData.genre}`);
    console.log(`😊 Mood: ${songData.mood}`);
    console.log(`⏱️  Duration: ${songData.duration}`);
    console.log(`📅 Release Date: ${songData.releaseDate}`);
    console.log(`🔗 Stream URL: ${songData.stream_url || 'Not available'}`);
    console.log(`⬇️  Download URL: ${songData.download_url || 'Not available'}`);
    console.log('================================\n');
}

/**
 * Validate that a song has required URLs
 * @param {Object} song - Song object
 * @returns {boolean} True if song has valid URLs
 */
/**
 * Search within a list of songs locally
 * @param {Array} songs - Array of songs to search in
 * @param {string} query - Search query
 * @returns {Array} Filtered songs
 */
export function searchInSongs(songs, query) {
    if (!query || !songs || songs.length === 0) {
        return [];
    }
    
    const searchTerm = query.toLowerCase();
    
    return songs.filter(song => {
        const title = (song.name || song.title || '').toLowerCase();
        const artist = song.artists && Array.isArray(song.artists)
            ? song.artists.map(a => a.name).join(' ').toLowerCase()
            : (song.artist || '').toLowerCase();
        const genre = (song.genre || '').toLowerCase();
        
        return title.includes(searchTerm) || 
               artist.includes(searchTerm) || 
               genre.includes(searchTerm);
    });
}

export function validateSongUrls(song) {
    const streamUrl = song.previewUrl || song.stream_url || song.streamUrl || song.stream || song.url;
    const downloadUrl = song.download?.regular || song.download_url || song.downloadUrl || song.download || streamUrl;
    
    if (!streamUrl && !downloadUrl) {
        console.warn('⚠️ Song has no valid URLs available');
        return false;
    }
    
    return true;
}
