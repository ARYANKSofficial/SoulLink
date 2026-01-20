import React, { useState } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';

const FileUpload = ({ roomId }) => {
    const socket = useSocket();
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const serverUrl = import.meta.env.VITE_SERVER_URL || '';
            const res = await axios.post(`${serverUrl}/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const { url, filename, type } = res.data;

            // Send file message via socket
            const messageData = {
                roomId,
                text: `Shared a file: ${filename}`,
                fileUrl: url,
                fileType: type,
                sender: socket.id,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            socket.emit('send_message', messageData);
            setUploading(false);
        } catch (err) {
            console.error('Upload failed', err);
            setUploading(false);
            alert('Upload failed');
        }
    };

    return (
        <div className="relative">
            <input
                type="file"
                id="file-input"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
            />
            <label
                htmlFor="file-input"
                className={`cursor-pointer w-10 h-10 flex items-center justify-center rounded-full transition-colors ${uploading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 text-purple-400'
                    }`}
            >
                {uploading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full"
                    />
                ) : (
                    <span className="text-xl">📎</span>
                )}
            </label>
        </div>
    );
};

export default FileUpload;
