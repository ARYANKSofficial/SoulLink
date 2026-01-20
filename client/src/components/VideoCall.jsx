import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';

const VideoCall = ({ roomId }) => {
    const socket = useSocket();
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [status, setStatus] = useState('Initializing...');
    const [connectionState, setConnectionState] = useState('new');
    const [isCallEnded, setIsCallEnded] = useState(false);

    const localVideoRef = useRef();
    const remoteVideoRef = useRef();

    // WebRTC References
    const peerConnection = useRef(null);
    const localStreamRef = useRef(null); // Keep sync ref for logic
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
        setIsCallEnded(true);

        if (notify && remoteSocketId.current) {
            socket.emit('end-call', { to: remoteSocketId.current });
        }

        // Navigate home or close window logic if needed, 
        // but for now we just show ended state or reload
        window.location.reload();
    };

    // ----------------------------------------------------------------
    // 2. PEER CONNECTION SETUP
    // ----------------------------------------------------------------
    const createPeerConnection = (targetId) => {
        // Prevent duplicate PC
        if (peerConnection.current) return peerConnection.current;

        console.log("Creating new RTCPeerConnection");
        const pc = new RTCPeerConnection(rtcConfig);

        // ICE Candidate Handling
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                // console.log("Sending ICE Candidate"); // Verbose
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: targetId
                });
            }
        };

        // Track Handling (Receive Remote Stream)
        pc.ontrack = (event) => {
            console.log("ontrack fired! Streams:", event.streams.length);
            const stream = event.streams[0];

            // 1. Update State
            setRemoteStream(stream);

            // 2. Direct Video Element Binding (Backup to State)
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                remoteVideoRef.current.play().catch(e => console.error("Remote play error:", e));
            }

            // 3. Handle unmute events (Common mobile issue)
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                console.log(`Remote video track status: ${videoTrack.readyState}, muted: ${videoTrack.muted}`);
                videoTrack.onunmute = () => {
                    console.log("Remote video track unmuted. Playing...");
                    if (remoteVideoRef.current) remoteVideoRef.current.play();
                };
            }
        };

        // State Monitoring
        pc.onconnectionstatechange = () => {
            console.log("Connection State:", pc.connectionState);
            setConnectionState(pc.connectionState);
            if (pc.connectionState === 'connected') setStatus('Connected');
            if (pc.connectionState === 'failed') setStatus('Failed. Retrying or Ending...');
        };

        peerConnection.current = pc;
        return pc;
    };

    // ----------------------------------------------------------------
    // 3. LOCAL MEDIA SETUP
    // ----------------------------------------------------------------
    const setupLocalMedia = async (pc) => {
        try {
            // If we already have a stream, reuse it? No, explicit reference flow says setup.
            // But we might have initialized it already? 
            // Better to ensure it's fresh or check ref.

            let stream = localStreamRef.current;
            if (!stream) {
                console.log("Acquiring local media...");
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                setLocalStream(stream);

                // Bind to local video
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            }

            // Add tracks to PC (CRITICAL STEP BEFORE SIGNALING)
            if (pc) {
                stream.getTracks().forEach(track => {
                    // Check if track already added?
                    const senders = pc.getSenders();
                    const alreadyHas = senders.some(s => s.track === track);
                    if (!alreadyHas) {
                        console.log(`Adding local track: ${track.kind}`);
                        pc.addTrack(track, stream);
                    }
                });
            }
            return stream;
        } catch (err) {
            console.error("Error accessing media:", err);
            setStatus('Camera Error');
            throw err;
        }
    };

    // ----------------------------------------------------------------
    // 4. SIGNALING HANDLERS
    // ----------------------------------------------------------------

    // Process queued candidates
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

        // --- HOST FLOW ---
        const handleUserJoined = async (userId) => {
            console.log(`User joined (${userId}). Starting HOST flow...`);
            remoteSocketId.current = userId;
            setStatus('Initiating Call...');

            // 1. Create PC
            const pc = createPeerConnection(userId);

            // 2. Setup Local Media & Tracks
            try {
                await setupLocalMedia(pc);
            } catch (e) { return; }

            // 3. Create Offer
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                console.log("Sending Offer");
                socket.emit('offer', { offer, to: userId, from: socket.id });
            } catch (e) {
                console.error("Offer Error:", e);
            }
        };

        // --- JOINER FLOW ---
        const handleOffer = async (data) => {
            console.log("Received Offer from:", data.from);
            remoteSocketId.current = data.from;
            setStatus('Accepting Call...');

            // 1. Create PC
            const pc = createPeerConnection(data.from);

            // 2. Setup Local Media & Tracks (Symmetry)
            try {
                await setupLocalMedia(pc);
            } catch (e) { return; }

            try {
                // 3. Set Remote Description
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                isRemoteDescriptionSet.current = true;
                await flushCandidatesQueue(pc); // Flush early candidates

                // 4. Create Answer
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                console.log("Sending Answer");
                socket.emit('answer', { answer, to: data.from });
            } catch (e) {
                console.error("Answer Error:", e);
            }
        };

        const handleAnswer = async (data) => {
            console.log("Received Answer");
            const pc = peerConnection.current;
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                    isRemoteDescriptionSet.current = true;
                    await flushCandidatesQueue(pc);
                } catch (e) {
                    console.error("SetRemote (Answer) Error:", e);
                }
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
                    console.log("Queueing ICE candidate");
                    candidatesQueue.current.push(candidate);
                }
            }
        };

        const handleEndCall = () => {
            console.log("Remote peer ended call");
            terminateCall(false); // Don't notify back
        };

        socket.on('user_joined', handleUserJoined);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('end-call', handleEndCall); // Assuming backend supports forwarding this or we emit directly

        // Cleanup on unmount
        return () => {
            socket.off('user_joined', handleUserJoined);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('end-call', handleEndCall);
            if (peerConnection.current) peerConnection.current.close();
        };
    }, [socket, roomId]);

    // ----------------------------------------------------------------
    // 5. EFFECT: REACTIVE VIDEO BINDING
    // ----------------------------------------------------------------
    useEffect(() => {
        // Ensure remote video element plays when stream updates
        if (remoteStream && remoteVideoRef.current) {
            console.log("Re-binding remote stream to video element");
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.error("Play error:", e));
        }
    }, [remoteStream]);


    return (
        <div className="flex flex-col gap-4">
            <div className={`text-center text-sm font-mono px-4 py-2 rounded ${connectionState === 'connected' ? 'bg-green-500/20 text-green-300' : 'bg-gray-800 text-gray-300'
                }`}>
                Status: {status} <span className="text-xs opacity-50">({connectionState})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* My Video */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative bg-black rounded-lg overflow-hidden aspect-video shadow-lg ring-1 ring-gray-700"
                >
                    {localStream ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 animate-pulse">Initializing Camera...</div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">You</div>
                </motion.div>

                {/* Remote Video */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative bg-black rounded-lg overflow-hidden aspect-video shadow-lg ring-1 ring-gray-700 border-2 border-transparent"
                    style={{ borderColor: connectionState === 'connected' ? '#10B981' : 'transparent' }}
                >
                    {remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover bg-gray-900"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
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
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">Partner</div>
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
