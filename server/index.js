const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
    }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Basic route
app.get('/', (req, res) => {
    res.send('SoulLink Server is running');
});

require('dotenv').config();
const TeraboxUploader = require('./terabox');

// ... (previous code)

app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const localUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Check for Terabox credentials
    if (process.env.TERABOX_NDUS && process.env.TERABOX_APP_ID) {
        console.log('Attempting Terabox upload...');
        const credentials = {
            ndus: process.env.TERABOX_NDUS,
            appId: process.env.TERABOX_APP_ID,
            uploadId: process.env.TERABOX_UPLOAD_ID,
            jsToken: process.env.TERABOX_JS_TOKEN,
            browserId: process.env.TERABOX_BROWSER_ID,
        };

        try {
            const uploader = new TeraboxUploader(credentials);
            const filePath = path.join(__dirname, 'uploads', req.file.filename);

            // Upload to root directory for simplicity
            const result = await uploader.uploadFile(filePath, false, '/');

            if (result.success) {
                console.log('Terabox upload success:', result.fileDetails);
                // Note: The tool might not return a direct public download link instantly.
                // We will return the metadata. ideally we would get a share link.
                // For now, we return the local URL as fallback for immediate display 
                // but include terabox details.
                return res.json({
                    url: localUrl,
                    filename: req.file.originalname,
                    type: req.file.mimetype,
                    terabox: result.fileDetails
                });
            } else {
                console.error('Terabox upload failed:', result.message);
                // Fallback to local
            }
        } catch (error) {
            console.error('Terabox upload error:', error.message);
        }
    }

    res.json({ url: localUrl, filename: req.file.originalname, type: req.file.mimetype });
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Room Signaling
    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
        // Notify others in room
        socket.to(roomId).emit('user_joined', socket.id);
    });

    socket.on('offer', (data) => {
        // data: { offer, to, from }
        io.to(data.to).emit('offer', data);
    });

    socket.on('answer', (data) => {
        // data: { answer, to }
        io.to(data.to).emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
        // data: { candidate, to }
        io.to(data.to).emit('ice-candidate', data);
    });

    socket.on('send_message', (data) => {
        // data: { roomId, text, ... }
        if (data.roomId) {
            io.to(data.roomId).emit('receive_message', data);
        } else {
            // Fallback or error
            socket.broadcast.emit('receive_message', data);
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
