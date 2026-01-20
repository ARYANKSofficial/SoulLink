import { useState, useEffect } from 'react'
import { SocketProvider, useSocket } from './context/SocketContext'
import Chat from './components/Chat'
import VideoCall from './components/VideoCall'

const RoomManager = () => {
  // --------------------------------------------------------
  // 1. ALL HOOKS MUST BE AT THE TOP LEVEL
  // --------------------------------------------------------
  const socket = useSocket();

  // State Hooks
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);
  const [activeTab, setActiveTab] = useState('call');

  // handlers
  const joinRoom = (e) => {
    e.preventDefault();
    if (room && socket) {
      socket.emit('join_room', room);
      setJoined(true);
    }
  };

  // --------------------------------------------------------
  // 2. CONDITIONAL RENDERING (AFTER HOOKS)
  // --------------------------------------------------------

  // LOGIN SCREEN
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

  // MAIN APP INTERFACE
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* App Header */}
      <header className="p-3 bg-gray-800/80 backdrop-blur-md shadow-md flex justify-between items-center z-10 shrink-0">
        <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          SoulLink <span className="text-gray-500 text-xs font-mono ml-2">#{room}</span>
        </h1>
      </header>

      {/* Main Content Area - Components stay mounted! */}
      <main className="flex-1 relative overflow-hidden w-full max-w-md mx-auto md:max-w-4xl">

        {/* CALL TAB CONTAINER */}
        <div className={`absolute inset-0 flex flex-col p-4 transition-opacity duration-300 ${activeTab === 'call' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          <VideoCall roomId={room} />
        </div>

        {/* CHAT TAB CONTAINER */}
        <div className={`absolute inset-0 flex flex-col p-4 transition-opacity duration-300 ${activeTab === 'chat' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          <Chat roomId={room} />
        </div>

      </main>

      {/* Bottom Tab Navigation */}
      <nav className="shrink-0 bg-gray-800 border-t border-gray-700 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto md:max-w-4xl">

          <button
            onClick={() => setActiveTab('call')}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'call' ? 'text-purple-400 bg-gray-700/50' : 'text-gray-400 hover:bg-gray-700/30'}`}
          >
            <span className="text-2xl mb-1">📹</span>
            <span className="text-xs font-medium">Video Call</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'chat' ? 'text-purple-400 bg-gray-700/50' : 'text-gray-400 hover:bg-gray-700/30'}`}
          >
            <span className="text-2xl mb-1">💬</span>
            <span className="text-xs font-medium">Chat</span>
          </button>

        </div>
      </nav>
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
