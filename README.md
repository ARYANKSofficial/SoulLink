# SoulLink 🔗

SoulLink is a one-to-one, real-time video calling and chat application designed for private sessions.
It focuses on simplicity, low latency, and seamless switching between video call and chat, inspired by modern mobile communication apps.

---

## FEATURES

### One-to-One Video Calling
- Peer-to-peer video calling using native WebRTC
- Designed strictly for single user to single user sessions
- No group calls supported

### Real-Time Chat
- Instant messaging during the call using Socket.io
- Chat and call run in parallel without reconnecting

### Tabbed Interface (Call ↔ Chat)
- Users can switch between Call and Chat tabs
- Video call continues without disconnecting
- Components remain mounted to preserve session state

### Picture-in-Picture Style Minimized Video
- When switching to the chat tab, the video minimizes to a small window
- Positioned at the bottom-right corner
- Acts as a persistent preview, not a draggable PiP
- The minimized video window is not draggable

### File Sharing (During Call Only)
- Files can be shared during an active call session
- Shared files are downloadable instantly
- No long-term or guaranteed persistent file storage
- Files are available only during the call or session window

### Mobile-First UI
- Fully responsive interface
- Built with Tailwind CSS
- Optimized for mobile and small screens

### Secure Communication
- HTTPS enabled for deployment
- WebRTC media streams are peer-to-peer

---

## TECH STACK

### Frontend
- React (Vite)
- Tailwind CSS
- Framer Motion
- Socket.io-client
- WebRTC

### Backend
- Node.js
- Express
- Socket.io
- Multer (temporary file handling)

### WebRTC Infrastructure
- Metered TURN/STUN servers for reliable connectivity across different networks

---

## GETTING STARTED

### Prerequisites
- Node.js v16 or higher
- npm or yarn

### Installation

Clone the repository:

```bash
git clone https://github.com/ARYANKSofficial/SoulLink.git
cd SoulLink
```

**Backend Setup**
```bash
cd server
npm install
# Create a .env file (PORT, CLIENT_URL, etc.)
npm start
```

**Frontend Setup**
```bash
cd client
npm install
# Create a .env file with VITE_SERVER_URL and TURN credentials if required
npm run dev
```

### TURN SERVER SETUP (Recommended)

For video calls to work reliably across different networks (e.g., WiFi ↔ mobile data),
a TURN server is recommended.

1. Sign up at [https://metered.ca](https://metered.ca)
2. Obtain TURN credentials
3. Add them to `client/.env`:

```env
VITE_TURN_USERNAME=your_username
VITE_TURN_CREDENTIAL=your_credential
```

## DEPLOYMENT

- Frontend deployed on Vercel
- Backend deployed on Render
- Automatic redeployments on GitHub push

## CURRENT LIMITATIONS

- One-to-one calling only
- No guaranteed persistent file storage
- No authentication system
- Minimized video window is not draggable
