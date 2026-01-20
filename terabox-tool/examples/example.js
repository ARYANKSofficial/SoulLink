// Import the TeraboxUploader class from your library
const TeraboxUploader = require('./index'); // Make sure to use the correct path to your module

// Step 1: Set up your Terabox credentials
const credentials = {
  ndus: 'your-ndus-token',  // Replace with your actual ndus token
  appId: 'your-app-id',     // Replace with your actual appId
  uploadId: 'your-upload-id', // Replace with your actual uploadId
  jsToken: 'your-js-token', // Replace with your jsToken
  browserId: 'your-browser-id' // Replace with your browserId
};

// Step 2: Create a new instance of the TeraboxUploader with your credentials
const uploader = new TeraboxUploader(credentials);

// Step 3: Define the file you want to upload (replace with the path to your file)
const filePath = './path/to/your/file.txt'; // Example: './myDocuments/photo.jpg'

// Step 4: (Optional) Track upload progress with a simple callback function
// This will show how much of the file has been uploaded
const showProgress = (loaded, total) => {
  const percentage = ((loaded / total) * 100).toFixed(2);
  console.log(`Uploading... ${percentage}% complete`);
};

// Step 5: Upload the file
async function uploadFile() {
  try {
    // Upload the file to Terabox, specify a directory (optional)
    const result = await uploader.uploadFile(filePath, showProgress, '/myUploads'); // Change '/myUploads' to your desired directory

    // Check if the upload was successful
    if (result.success) {
      console.log('File uploaded successfully!');
      console.log('File details:', result.fileDetails);  // Show details of the uploaded file
    } else {
      console.log('Upload failed:', result.message);  // Show error message
    }
  } catch (error) {
    console.log('An error occurred during the upload:', error.message); // Handle any errors
  }
}

// Step 6: Fetch a list of files from Terabox (optional)
async function fetchFileList() {
  try {
    // Get a list of files from your Terabox account
    const fileList = await uploader.fetchFileList('/myUploads');  // Specify the directory to list files
    console.log('Files in your directory:', fileList);  // Show the list of files
  } catch (error) {
    console.log('Error fetching file list:', error.message); // Handle any errors
  }
}

// Step 7: Call the functions to upload the file and/or fetch the file list

// uploadFile();  // Upload the file

fetchFileList(); //Fetch files 
