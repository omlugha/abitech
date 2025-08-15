/**
 * MP3 Download utility functions
 * Handles downloading MP3 files from URLs
 */

import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { URL } from 'url';

/**
 * Download MP3 file from URL
 * @param {string} url - Download URL
 * @param {string} filename - Local filename
 * @param {string} directory - Download directory (optional)
 * @returns {Promise<string>} Path to downloaded file
 */
export async function downloadMP3(url, filename, directory = './downloads') {
    return new Promise((resolve, reject) => {
        try {
            if (!url) {
                reject(new Error('Download URL is required'));
                return;
            }

            // Create downloads directory if it doesn't exist
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
                console.log(`📁 Created directory: ${directory}`);
            }

            // Sanitize filename
            const sanitizedFilename = sanitizeFilename(filename);
            const filePath = path.join(directory, sanitizedFilename);

            console.log(`⬇️ Starting download: ${sanitizedFilename}`);
            console.log(`🔗 From URL: ${url}`);

            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const file = fs.createWriteStream(filePath);
            let downloadedBytes = 0;

            const request = protocol.get(url, (response) => {
                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302) {
                    const redirectUrl = response.headers.location;
                    console.log(`🔄 Following redirect to: ${redirectUrl}`);
                    downloadMP3(redirectUrl, filename, directory)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: Failed to download file`));
                    return;
                }

                const totalBytes = parseInt(response.headers['content-length'], 10);
                
                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (totalBytes) {
                        const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                        process.stdout.write(`\r📊 Progress: ${progress}% (${formatBytes(downloadedBytes)}/${formatBytes(totalBytes)})`);
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    console.log(`\n✅ Download completed: ${filePath}`);
                    console.log(`📦 File size: ${formatBytes(downloadedBytes)}`);
                    resolve(filePath);
                });
            });

            request.on('error', (error) => {
                fs.unlink(filePath, () => {}); // Delete partial file
                reject(new Error(`Download failed: ${error.message}`));
            });

            file.on('error', (error) => {
                fs.unlink(filePath, () => {}); // Delete partial file
                reject(new Error(`File write error: ${error.message}`));
            });

        } catch (error) {
            reject(new Error(`Download setup failed: ${error.message}`));
        }
    });
}

/**
 * Sanitize filename to be filesystem-safe
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        return `song_${Date.now()}.mp3`;
    }

    // Remove or replace invalid characters
    let sanitized = filename
        .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid chars with underscore
        .replace(/\s+/g, '_')           // Replace spaces with underscore
        .replace(/_{2,}/g, '_')         // Replace multiple underscores with single
        .replace(/^_|_$/g, '');         // Remove leading/trailing underscores

    // Ensure it ends with .mp3
    if (!sanitized.toLowerCase().endsWith('.mp3')) {
        sanitized += '.mp3';
    }

    // Ensure filename is not empty and not too long
    if (sanitized === '.mp3' || sanitized.length < 5) {
        sanitized = `song_${Date.now()}.mp3`;
    } else if (sanitized.length > 200) {
        const nameWithoutExt = sanitized.slice(0, -4);
        sanitized = nameWithoutExt.substring(0, 196) + '.mp3';
    }

    return sanitized;
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if download directory is writable
 * @param {string} directory - Directory path
 * @returns {boolean} True if writable
 */
export function checkDownloadDirectory(directory = './downloads') {
    try {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Test write permission
        const testFile = path.join(directory, '.write_test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);

        return true;
    } catch (error) {
        console.error(`❌ Download directory not writable: ${error.message}`);
        return false;
    }
}

/**
 * Get file info if it exists
 * @param {string} filePath - Path to file
 * @returns {Object|null} File stats or null
 */
export function getFileInfo(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                sizeFormatted: formatBytes(stats.size)
            };
        }
        return null;
    } catch (error) {
        console.error(`❌ Error getting file info: ${error.message}`);
        return null;
    }
}
