import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';

const VideoCall = ({ roomId, activeTab }) => {
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

    // ----------------------------------------------------------------
    // 6. UI LAYOUT STATE
    // ----------------------------------------------------------------
    const [primaryVideo, setPrimaryVideo] = useState('remote');

    // Reset primary video to remote if switching tabs (optional, but good for PiP consistency)
    useEffect(() => {
        if (activeTab === 'chat') {
            setPrimaryVideo('remote');
        }
    }, [activeTab]);

    const toggleLayout = () => {
        if (activeTab === 'chat') return; // Disable swap in PiP mode
        setPrimaryVideo(prev => prev === 'remote' ? 'local' : 'remote');
    };

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

    // PIP vs FULLSCREEN Logic
    const isPiP = activeTab === 'chat';

    // Styles for the two states (Internal to the container)
    const fullscreenStyles = "absolute inset-0 w-full h-full z-0";
    const floatingStyles = "absolute bottom-4 right-4 w-32 h-48 bg-black/80 rounded-xl shadow-2xl border-2 border-white/20 z-20 cursor-pointer hover:scale-105 transition-all duration-300 overflow-hidden";

    const localClasses = primaryVideo === 'remote' ? floatingStyles : fullscreenStyles;
    const remoteClasses = primaryVideo === 'local' ? floatingStyles : fullscreenStyles;

    return (
        <motion.div
            layout
            {...(isPiP ? { "data-pip": "true" } : {})}
            drag={isPiP}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.05}
            dragMomentum={false}
            initial={false}
            animate={isPiP ? {
                position: 'fixed',
                width: '120px',
                height: '180px',
                bottom: '100px', // Adjusted to be clearly above nav
                right: '16px',
                top: 'auto',
                left: 'auto',
                borderRadius: '16px',
                zIndex: 9999,
                boxShadow: "0px 10px 30px rgba(0,0,0,0.5)",
                borderWidth: '2px', // Add explicit border width
                borderColor: 'rgba(255, 255, 255, 0.2)' // Add explicit border color
            } : {
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                borderRadius: '0px',
                zIndex: 0,
                boxShadow: "none",
                borderWidth: '0px',
                borderColor: 'transparent'
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`bg-black overflow-hidden ${isPiP ? 'cursor-grab active:cursor-grabbing border-gray-700' : ''}`}
        >
            {/* STATUS OVERLAY - Hide in PiP */}
            {!isPiP && (
                <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-30 px-4 py-1 rounded-full text-xs font-mono font-bold backdrop-blur-md transition-colors duration-500 ${connectionState === 'connected'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-100 border border-red-500/30 animate-pulse'
                    }`}>
                    {status}
                </div>
            )}

            {/* END CALL BUTTON - Hide in PiP */}
            {!isPiP && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
                    <button
                        onClick={() => terminateCall(true)}
                        className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
                        title="End Call"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                        </svg>
                    </button>
                </div>
            )}

            {/* LOCAL VIDEO CONTAINER */}
            <motion.div
                layout
                className={localClasses}
                style={{
                    display: isPiP ? 'none' : 'block' // Hide explicitly in PiP
                }}
                onClick={() => primaryVideo === 'remote' && toggleLayout()}
                initial={false}
                animate={{
                    borderRadius: (primaryVideo === 'remote' && !isPiP) ? '12px' : '0px'
                }}
            >
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover transform scale-x-[-1] ${localStream ? 'opacity-100' : 'opacity-0'}`}
                />
                {!localStream && !isPiP && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs font-mono animate-pulse bg-gray-900">
                        Init Camera...
                    </div>
                )}
                {!isPiP && <div className="absolute bottom-1 left-2 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white/90">You</div>}
            </motion.div>


            {/* REMOTE VIDEO CONTAINER */}
            <motion.div
                layout
                className={isPiP ? "absolute inset-0 w-full h-full" : remoteClasses}
                onClick={() => primaryVideo === 'local' && toggleLayout()}
                initial={false}
                animate={{
                    borderRadius: (primaryVideo === 'local' && !isPiP) ? '12px' : '0px'
                }}
            >
                <video
                    ref={remoteVideoRef}
                    playsInline
                    autoPlay
                    className={`w-full h-full object-cover bg-gray-900 transition-opacity duration-300 ${remoteStream ? 'opacity-100' : 'opacity-0'}`}
                />

                {!remoteStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400">
                        {isPiP ? (
                            <span className="text-2xl animate-pulse">👥</span>
                        ) : (
                            connectionState === 'connected' ? (
                                <p className="animate-pulse text-sm">Waiting for video...</p>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <span className="text-4xl mb-4 animate-bounce">👤</span>
                                    <p className="text-sm font-medium animate-pulse">Waiting for partner...</p>
                                </div>
                            )
                        )}
                    </div>
                )}
            </motion.div>

        </motion.div>
    );
};

export default VideoCall;
