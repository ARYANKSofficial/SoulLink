const axios = require('axios');

/**
 * Generates a short URL for a file in Terabox.
 * @param {string} ndus - User authentication token.
 * @param {string} path - The file path in Terabox.
 * @param {string} fid - The file ID.
 * @returns {Promise<object|null>} - A promise that resolves to the API response containing the short URL or null if an error occurs.
 */
const getShortUrl = async (ndus, path, fid) => {
    try {
        // API Endpoint
        const url = 'https://www.1024terabox.com/share/pset';
        const cookies = `ndus=${ndus}`;

        // Form Data Parameters
        const formData = new URLSearchParams({
            app_id: '250528',
            web: '1',
            channel: 'dubox',
            clienttype: '0',
            app: 'universe',
            schannel: '0',
            channel_list: '[0]',
            period: '0',
            path_list: `["${path}"]`,
            fid_list: `[${fid}]`,
            pwd: '',
            public: '1',
            scene: ''
        });

        // Request Headers
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookies,
            'Referer': 'https://www.1024terabox.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };

        // Send POST request to generate a short URL
        const response = await axios.post(url, formData.toString(), { headers });

        // Return the API response containing the short URL
        return response.data;
    } catch (error) {
        console.error('Error generating short link:', error);
        return null;
    }
};

module.exports = getShortUrl;
