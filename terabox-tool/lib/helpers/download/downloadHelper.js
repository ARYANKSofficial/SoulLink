const axios = require('axios');

/**
 * Generates a cryptographic sign using RC4-like encryption.
 * @param {string} s1 - First input string (key).
 * @param {string} s2 - Second input string (data).
 * @returns {string} - Base64 encoded signed string.
 */
function generateSign(s1, s2) {
    try {
        if (!s1 || !s2) {
            return { success: false, message: "Provide both the signs" };
        }
        
        const p = new Uint8Array(256);
        const a = new Uint8Array(256);
        const result = [];

        for (let i = 0; i < 256; i++) {
            a[i] = s1.charCodeAt(i % s1.length);
            p[i] = i;
        }

        let j = 0;
        for (let i = 0; i < 256; i++) {
            j = (j + p[i] + a[i]) % 256;
            [p[i], p[j]] = [p[j], p[i]];
        }

        let i = 0;
        j = 0;
        for (let q = 0; q < s2.length; q++) {
            i = (i + 1) % 256;
            j = (j + p[i]) % 256;
            [p[i], p[j]] = [p[j], p[i]];
            const k = p[(p[i] + p[j]) % 256];
            result.push(s2.charCodeAt(q) ^ k);
        }

        return Buffer.from(result).toString('base64');
    } catch (error) {
        console.error("Error generating sign:", error.message);
        return null;
    }
}

/**
 * Fetches home information from Terabox API.
 * @param {string} ndus - User authentication token.
 * @returns {Promise<{success: boolean, message: string, data?: object}>} - The response data from the API.
 */
async function fetchHomeInfo(ndus) {
    const url = "https://www.1024terabox.com/api/home/info";

    try {
        if (!ndus) {
            return { success: false, message: "User authentication token (ndus) is required" };
        }
        
        const response = await axios.get(url, {
            params: {
                app_id: "250528",
                web: "1",
                channel: "dubox",
                clienttype: "0",
            },
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Cookie": `ndus=${ndus}`,
            },
        });
        return { success: true, message: "Home info retrieved successfully.", data: response.data.data };
    } catch (error) {
        console.error("Error fetching home info:", error.response?.data || error.message);
        return { success: false, message: error.message || "Failed to fetch home info." };
    }
}

/**
 * Generates a download link for a file from Terabox.
 * @param {string} sign - Encrypted sign generated using `generateSign`.
 * @param {string} fid - File ID of the file to be downloaded.
 * @param {number} timestamp - Timestamp of the request.
 * @param {string} ndus - User authentication token.
 * @returns {Promise<{success: boolean, message: string, downloadLink?: string}>}
 */
async function generateDownload(sign, fid, timestamp, ndus) {
    const url = "https://www.1024terabox.com/api/download";

    try {
        if (!sign || !fid || !timestamp || !ndus) {
            return { success: false, message: "Missing required parameters for generating download link." };
        }
        
        const response = await axios.get(url, {
            params: {
                app_id: "250528",
                web: "1",
                channel: "dubox",
                clienttype: "0",
                fidlist: `[${fid}]`,
                type: "dlink",
                vip: "2",
                sign,
                timestamp,
                need_speed: "0",
            },
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
                "Cookie": `ndus=${ndus}`,
            },
        });

        if (!response.data.dlink) {
            return { success: false, message: "No download link received." };
        }

        return { success: true, message: "Download link generated successfully.", downloadLink: response.data.dlink };
    } catch (error) {
        console.error("Error generating download link:", error.response?.data || error.message);
        return { success: false, message: error.message || "Failed to generate download link." };
    }
}

module.exports = {
    generateSign,
    fetchHomeInfo,
    generateDownload,
};
