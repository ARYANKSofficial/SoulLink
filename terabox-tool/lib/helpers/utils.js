/**
 * Builds the URL for uploading a file chunk.
 * @param {string} fileName - The name of the file being uploaded
 * @param {string} uploadId - The unique ID for the upload session (optional)
 * @param {string} appId - The application ID (required)
 * @returns {string} - The upload URL
 */
function buildUploadUrl(fileName, uploadId, appId) {
  return `https://c-jp.1024terabox.com/rest/2.0/pcs/superfile2?method=upload&app_id=${appId}&channel=dubox&clienttype=0&web=1&path=%2F${encodeURIComponent(fileName)}&uploadid=${uploadId}&uploadsign=0&partseq=0`;
}

/**
 * Builds the URL for the final create call.
 * @returns {string} - The create URL
 */
function buildCreateUrl() {
  return 'https://www.1024terabox.com/api/create';
}

/**
 * Builds the URL for fetching the file list.
 * @param {string} appId - The application ID
 * @param {string} directory - The directory path to fetch the file list from
 * @returns {string} - The file list URL
 */
function buildListUrl(appId, directory) {
  return `https://www.1024terabox.com/api/list?app_id=${appId}&web=1&channel=dubox&clienttype=0&order=time&desc=1&dir=${encodeURIComponent(directory)}&num=100&page=1&showempty=0`;
}


/**
 * Builds the downloadable link for videos.
 * @param {string} appId - The application ID
 * @param {string} videoPath - The directory path to fetch the file list from
 * @returns {string} - The file list URL
 */
function buildVideoDownloadUrl(appId, videoPath) {
  return `https://www.1024terabox.com/api/streaming?path=${encodeURIComponent(videoPath)}&app_id=${appId}&clienttype=0&type=M3U8_FLV_264_480&vip=1`;
}

module.exports = { buildUploadUrl, buildCreateUrl, buildListUrl, buildVideoDownloadUrl };
