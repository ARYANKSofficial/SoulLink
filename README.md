# SoulLink 🔗

SoulLink is a one-to-one, real-time video calling and chat application designed for private sessions.
It focuses on simplicity, low latency, and seamless switching between video call and chat, inspired by modern mobile communication apps.

## FEATURES

### One-to-One Video Calling
- Peer-to-peer video calling using native WebRTC
- Designed strictly for single user to single user sessions
- No group calls

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
- No long-term file storage or cloud persistence
- Files are available only at the time of sharing

### Mobile-First UI
- Fully responsive interface
- Built with Tailwind CSS
- Optimized for mobile and small screens

### Secure Communication
- HTTPS enabled for deployment
- WebRTC media streams are peer-to-peer

## TECH STACK

**Frontend**
- React (Vite)
- Tailwind CSS
- Framer Motion
- Socket.io-client
- WebRTC

**Backend**
- Node.js
- Express
- Socket.io
- Multer (temporary file handling)

## GETTING STARTED

### Prerequisites
- Node.js v16 or higher
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ARYANKSofficial/SoulLink.git
    cd SoulLink
    ```

2.  **Backend Setup**
    ```bash
    cd server
    npm install
    # Create a .env file (PORT, CLIENT_URL, etc.)
    npm start
    ```

3.  **Frontend Setup**
    ```bash
    cd client
    npm install
    # Create a .env file with VITE_SERVER_URL
    npm run dev
    ```

3.  **TURN Server Setup (Recommended)**
    For video calls to work across different networks (e.g., WiFi to 4G), you need a TURN server.
    *   Sign up for a free account at [Metered.ca](https://www.metered.ca/turn-server).
    *   Get your `TURNS_USERNAME` and `TURNS_CREDENTIAL`.
    *   Add them to `client/.env`:
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
- No persistent file storage
- No authentication system
- Minimized video window is not draggable
