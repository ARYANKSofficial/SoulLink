import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';

const VideoCall = ({ roomId }) => {
    const socket = useSocket();
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [status, setStatus] = useState('Initializing...');
    const [connectionState, setConnectionState] = useState('new');

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // WebRTC References
    const peerConnection = useRef(null);
    const localStreamRef = useRef(null);
    const candidatesQueue = useRef([]);
    const isRemoteDescriptionSet = useRef(false);
    const remoteSocketId = useRef(null);

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            // Metered TURN
            {
                urls: [
                    'stun:stun.relay.metered.ca:80',
                    'turn:global.relay.metered.ca:80',
                    'turn:global.relay.metered.ca:80?transport=tcp',
                    'turn:global.relay.metered.ca:443',
                    'turns:global.relay.metered.ca:443?transport=tcp'
                ],
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_CREDENTIAL
            }
        ]
    };

    // ----------------------------------------------------------------
    // 1. CLEANUP & RESET
    // ----------------------------------------------------------------
    const terminateCall = (notify = true) => {
        console.log("Terminating call...");
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        // Stop local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }

        setLocalStream(null);
        setRemoteStream(null);
        candidatesQueue.current = [];
        isRemoteDescriptionSet.current = false;
        setConnectionState('closed');

        if (notify && remoteSocketId.current) {
            socket.emit('end-call', { to: remoteSocketId.current });
        }

        window.location.reload();
    };

    // ----------------------------------------------------------------
    // 2. IMMEDIATE LOCAL MEDIA INIT
    // ----------------------------------------------------------------
    useEffect(() => {
        const initLocalStream = async () => {
            try {
                console.log("Requesting local stream (Init)...");
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                setLocalStream(stream);

                // Bind to local video immediately
                if (localVideoRef.current) {
                    console.log("LOCAL STREAM READY: Binding to video element");
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.muted = true;
                    localVideoRef.current.play().catch(e => console.error("Local play error:", e));
                }
            } catch (err) {
                console.error("Error accessing local media:", err);
                setStatus('Camera Error');
            }
        };
        initLocalStream();

        // Cleanup on unmount
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (peerConnection.current) {
                peerConnection.current.close();
            }
        };
    }, []);

    // ----------------------------------------------------------------
    // 3. PEER CONNECTION & SIGNALING
    // ----------------------------------------------------------------
    const createPeerConnection = (targetId) => {
        if (peerConnection.current) return peerConnection.current;

        console.log("Creating new RTCPeerConnection");
        const pc = new RTCPeerConnection(rtcConfig);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: targetId
                });
            }
        };

        pc.ontrack = (event) => {
            console.log("ontrack fired! Streams:", event.streams.length);
            const stream = event.streams[0];
            setRemoteStream(stream);

            if (remoteVideoRef.current) {
                console.log("Directly binding remote stream to video element (ontrack)");
                remoteVideoRef.current.srcObject = stream;
                remoteVideoRef.current.play().catch(e => console.error("Remote play error:", e));
            } else {
                console.warn("remoteVideoRef.current NOT ready in ontrack");
            }

            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.onunmute = () => {
                    if (remoteVideoRef.current) remoteVideoRef.current.play();
                };
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("Connection State:", pc.connectionState);
            setConnectionState(pc.connectionState);
            if (pc.connectionState === 'connected') setStatus('Connected');
            if (pc.connectionState === 'failed') setStatus('Failed. Retrying...');
        };

        peerConnection.current = pc;
        return pc;
    };

    const addLocalTracks = (pc) => {
        const stream = localStreamRef.current;
        if (!stream) {
            console.error("Cannot add tracks - no local stream");
            return;
        }
        stream.getTracks().forEach(track => {
            const senders = pc.getSenders();
            const alreadyHas = senders.some(s => s.track === track);
            if (!alreadyHas) {
                pc.addTrack(track, stream);
            }
        });
    };

    const flushCandidatesQueue = async (pc) => {
        if (!pc || !candidatesQueue.current.length) return;
        console.log(`Flushing ${candidatesQueue.current.length} queued candidates`);
        while (candidatesQueue.current.length > 0) {
            const candidate = candidatesQueue.current.shift();
            try {
                await pc.addIceCandidate(candidate);
            } catch (e) { console.error("Error adding flushed candidate:", e); }
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleUserJoined = async (userId) => {
            console.log(`User joined (${userId}). Starting HOST flow...`);
            remoteSocketId.current = userId;
            setStatus('Initiating Call...');

            const pc = createPeerConnection(userId);

            // Wait briefly for local stream if not ready (race condition safety)
            if (!localStreamRef.current) {
                console.log("Waiting for local stream...");
                await new Promise(r => setTimeout(r, 1000));
            }
            addLocalTracks(pc);

            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                console.log("Sending Offer");
                socket.emit('offer', { offer, to: userId, from: socket.id });
            } catch (e) { console.error("Offer Error:", e); }
        };

        const handleOffer = async (data) => {
            console.log("Received Offer from:", data.from);
            remoteSocketId.current = data.from;
            setStatus('Accepting Call...');

            const pc = createPeerConnection(data.from);

            if (!localStreamRef.current) {
                console.log("Waiting for local stream...");
                await new Promise(r => setTimeout(r, 1000)); // Wait for init
            }
            addLocalTracks(pc);

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                isRemoteDescriptionSet.current = true;
                await flushCandidatesQueue(pc);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log("Sending Answer");
                socket.emit('answer', { answer, to: data.from });
            } catch (e) { console.error("Answer Error:", e); }
        };

        const handleAnswer = async (data) => {
            console.log("Received Answer");
            const pc = peerConnection.current;
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                    isRemoteDescriptionSet.current = true;
                    await flushCandidatesQueue(pc);
                } catch (e) { console.error("SetRemote (Answer) Error:", e); }
            }
        };

        const handleIceCandidate = async (data) => {
            const pc = peerConnection.current;
            if (!pc) return;

            if (data.candidate) {
                const candidate = new RTCIceCandidate(data.candidate);
                if (isRemoteDescriptionSet.current) {
                    pc.addIceCandidate(candidate).catch(e => console.error("ICE Error:", e));
                } else {
                    candidatesQueue.current.push(candidate);
                }
            }
        };

        const handleEndCall = () => {
            console.log("Remote peer ended call");
            terminateCall(false);
        };

        socket.on('user_joined', handleUserJoined);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('end-call', handleEndCall);

        return () => {
            socket.off('user_joined', handleUserJoined);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('end-call', handleEndCall);
        };
    }, [socket, roomId]);

    // ----------------------------------------------------------------
    // 4. REACTIVE VIDEO BINDING
    // ----------------------------------------------------------------
    useEffect(() => {
        // Ensure remote video element plays when stream updates
        if (remoteStream && remoteVideoRef.current) {
            console.log("Re-binding remote stream to video element");
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.error("Play error:", e));
        }
    }, [remoteStream]);


    // ----------------------------------------------------------------
    // 5. RENDER
    // ----------------------------------------------------------------
    return (
        <div className="flex flex-col gap-4">
            <div className={`text-center text-sm font-mono px-4 py-2 rounded ${connectionState === 'connected' ? 'bg-green-500/20 text-green-300' : 'bg-gray-800 text-gray-300'}`}>
                Status: {status} <span className="text-xs opacity-50">({connectionState})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* My Video */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative bg-black rounded-lg overflow-hidden aspect-video shadow-lg ring-1 ring-gray-700"
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${localStream ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {!localStream && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse">
                            Initializing Camera...
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white z-10">You</div>
                </motion.div>

                {/* Remote Video */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative bg-black rounded-lg overflow-hidden aspect-video shadow-lg ring-1 ring-gray-700 border-2 border-transparent"
                    style={{ borderColor: connectionState === 'connected' ? '#10B981' : 'transparent' }}
                >
                    <video
                        ref={remoteVideoRef}
                        playsInline
                        autoPlay
                        className={`w-full h-full object-cover bg-gray-900 transition-opacity duration-300 ${remoteStream ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
                    />

                    {!remoteStream && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 relative z-10 w-full h-full">
                            {connectionState === 'connected' ? (
                                <p className="animate-pulse">Waiting for video...</p>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-10 w-10 mb-2"></div>
                                    <p>Connecting...</p>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white z-20">Partner</div>
                </motion.div>
            </div>

            {(connectionState === 'connected' || connectionState === 'checking' || connectionState === 'new' || connectionState === 'failed') && (
                <div className="flex justify-center">
                    <button
                        onClick={() => terminateCall(true)}
                        className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold shadow-md transition-colors"
                    >
                        End Call
                    </button>
                </div>
            )}
        </div>
    );
};

export default VideoCall;
