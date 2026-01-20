import { useState, useEffect } from 'react'
import { SocketProvider, useSocket } from './context/SocketContext'
import Chat from './components/Chat'
import VideoCall from './components/VideoCall'
// import './App.css' // Removing old CSS

const RoomManager = () => {
  const socket = useSocket();
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);

  const joinRoom = (e) => {
    e.preventDefault();
    if (room && socket) {
      socket.emit('join_room', room);
      setJoined(true);
    }
  };

  if (!joined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">SoulLink</h1>
          <form onSubmit={joinRoom} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter Room ID (e.g., love-nest)"
              className="p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-purple-500"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            <button
              type="submit"
              className="p-3 rounded bg-purple-600 hover:bg-purple-700 font-bold transition-all"
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold text-purple-400">SoulLink <span className="text-gray-500 text-sm">#{room}</span></h1>
        <button onClick={() => window.location.reload()} className="text-sm text-red-400 hover:text-red-300">Leave</button>
      </header>
      <main className="flex-1 flex flex-col p-4 gap-4 max-w-6xl mx-auto w-full">
        <VideoCall roomId={room} />
        <Chat roomId={room} />
      </main>
    </div>
  );
};

function App() {
  return (
    <SocketProvider>
      <RoomManager />
    </SocketProvider>
  )
}

export default App
