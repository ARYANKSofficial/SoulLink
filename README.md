# SoulLink 🔗

**SoulLink** is a modern, real-time video calling and chat application designed for seamless connection. It features a responsive, tabbed interface that allows users to switch between video calls and chat without interruption, mimicking the experience of popular mobile apps.

## ✨ Features

-   **High-Quality Video Calling**: Peer-to-peer video calls using native WebRTC.
-   **Real-Time Chat**: Instant messaging with socket.io.
-   **Tabbed Interface**: Switch between "Call" and "Chat" tabs without unmounting components or dropping the call.
-   **Picture-in-Picture (PiP)**: Keep an eye on your partner in a floating, draggable video window while chatting.
-   **Floating/Fullscreen Layout**: Intelligent video layout management (FaceTime-style) with swap capabilities.
-   **Mobile-First Design**: Fully responsive UI built with Tailwind CSS, optimized for mobile devices.
-   **File Sharing**: Upload and share files directly within the chat.
-   **Secure**: HTTPS enabled for local testing and deployment.

## 🛠️ Tech Stack

**Frontend:**
-   **React**: UI Library (Vite)
-   **Tailwind CSS**: Styling
-   **Framer Motion**: Animations & Gestures (Draggable PiP)
-   **Socket.io-client**: Real-time signaling
-   **WebRTC**: Native browser API for peer-to-peer media

**Backend:**
-   **Node.js & Express**: Server runtime
-   **Socket.io**: WebSocket server for signaling and chat
-   **Multer/Terabox**: File upload handling

## 🚀 Getting Started

### Prerequisites
-   Node.js (v16 or higher)
-   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ARYANKSofficial/SoulLink.git
    cd SoulLink
    ```

2.  **Setup Backend**
    ```bash
    cd server
    npm install
    # Create a .env file based on your requirements (PORT, CLIENT_URL, etc.)
    npm start
    ```

3.  **Setup Frontend**
    ```bash
    cd client
    npm install
    # Create a .env file with VITE_SERVER_URL and TURN credentials if needed
    npm run dev
    ```

4.  **Access the App**
    Open your browser and navigate to `http://localhost:5173` (or the URL provided by Vite).

## 🌍 Deployment

-   **Frontend**: Deployed on Vercel.
-   **Backend**: Deployed on Render.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
