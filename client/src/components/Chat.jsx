import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import FileUpload from './FileUpload';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = ({ roomId }) => {
    const socket = useSocket();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (data) => {
            setMessages((prev) => [...prev, data]);
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => socket.off('receive_message', handleReceiveMessage);
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && socket) {
            const messageData = {
                roomId,
                text: input,
                sender: socket.id, // Use socket ID for identity
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            // Optimistic update
            // setMessages((prev) => [...prev, messageData]); // Server broadcasts to room, so we might receive it back? 
            // Actually usually senders append locally and emit. 
            // Server example: socket.to(room).emit... (excludes sender).
            // BUT my server refactor handles broadcast differently for rooms depending on logic.
            // Server code: io.to(roomId) -> includes sender.
            // So we DO NOT append locally to avoid dupes if server echoes.
            // Let's check server code again...
            // "io.to(data.roomId).emit" -> This INCLUDES the sender.
            // So we just emit.

            socket.emit('send_message', messageData);
            setInput('');
        }
    };

    const renderMessageContent = (msg) => {
        if (msg.fileUrl) {
            const isImage = msg.fileType && msg.fileType.startsWith('image/');
            if (isImage) {
                return (
                    <div className="flex flex-col">
                        <p className="mb-1">{msg.text}</p>
                        <img src={msg.fileUrl} alt="shared" className="max-w-[200px] rounded-lg border border-gray-600" />
                    </div>
                );
            } else {
                return (
                    <div className="flex flex-col">
                        <p className="mb-1">{msg.text}</p>
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline text-sm">Download File</a>
                    </div>
                );
            }
        }
        return <p>{msg.text}</p>;
    };

    return (
        <div className="flex flex-col h-full bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-xl">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900/50">
                <AnimatePresence>
                    {messages.map((msg, index) => {
                        const isMe = msg.sender === socket?.id;
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[70%] p-3 rounded-2xl ${isMe
                                    ? 'bg-purple-600 text-white rounded-br-none'
                                    : 'bg-gray-700 text-gray-200 rounded-bl-none'
                                    }`}>
                                    {renderMessageContent(msg)}
                                    <span className="text-[10px] opacity-70 block text-right mt-1">{msg.time}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>
            <div className="bg-gray-800 p-3 border-t border-gray-700 flex items-center gap-2">
                <FileUpload roomId={roomId} />
                <form onSubmit={sendMessage} className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 p-2 rounded-full bg-gray-700 border border-gray-600 focus:outline-none focus:border-purple-500 text-white"
                    />
                    <button type="submit" className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors w-10 h-10 flex items-center justify-center">
                        ➤
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
