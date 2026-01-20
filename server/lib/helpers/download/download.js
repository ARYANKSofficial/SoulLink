const { generateSign, fetchHomeInfo, generateDownload } = require('./downloadHelper');

/**
 * Generates a direct download link for a file from Terabox.
 * @param {string} ndus - User authentication token.
 * @param {string} fid - File ID of the file to be downloaded.
 * @returns {Promise<{success: boolean, message: string, downloadLink?: string}>} - A promise that resolves to an object containing success status, message, and the direct download link if successful.
 */
async function getDownloadLink(ndus, fid) {
    try {
        // Fetch home information to retrieve necessary parameters for signing
        const homeInfo = await fetchHomeInfo(ndus);
        
        if (!homeInfo || !homeInfo.data.sign3 || !homeInfo.data.sign1 || !homeInfo.data.timestamp) {
            return { success: false, message: "Invalid home information received." };
        }

        const sign1 = homeInfo.data.sign3;
        const sign2 = homeInfo.data.sign1;
        const timestamp = homeInfo.data.timestamp;

        // Generate the required sign using sign1 and sign2
        const sign = generateSign(sign1, sign2);
        if (!sign) {
            return { success: false, message: "Failed to generate sign." };
        }

        // Fetch the download link
        const responseDownload = await generateDownload(sign, fid, timestamp, ndus);
        if (!responseDownload || !responseDownload.downloadLink[0]?.dlink) {
            return { success: false, message: "Failed to retrieve download link." };
        }

        return { success: true, message: "Download link retrieved successfully.", downloadLink: responseDownload.downloadLink[0].dlink};
    } catch (error) {
        console.error("Error getting download link:", error);
        return { success: false, message: error.message || "Unknown error occurred while fetching download link." };
    }
}

module.exports = getDownloadLink;
