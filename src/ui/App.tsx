import React, { useState } from 'react';
import GalleryPage from './pages/GalleryPage';
import ChessPage from './pages/ChessPage';
import SportsPage from './pages/SportsPage';
import RoomSwitcher from './components/RoomSwitcher';

type Room = 'gallery' | 'chess' | 'sports';

export default function App() {
  const [currentRoom, setCurrentRoom] = useState<Room>('gallery');

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#0a0a0c', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <main
        key={currentRoom}
        style={{ width: '100%', height: '100%', animation: 'room-enter 0.4s ease-in-out', overflowY: 'auto' }}
      >
        {currentRoom === 'gallery' && <GalleryPage />}
        {currentRoom === 'chess' && <ChessPage />}
        {currentRoom === 'sports' && <SportsPage />}
      </main>
      <style>{`@keyframes room-enter { from { opacity: 0.72; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } @media (prefers-reduced-motion: reduce) { main { animation: none !important; } }`}</style>
      <RoomSwitcher currentRoom={currentRoom} onSwitchRoom={setCurrentRoom} />
    </div>
  );
}
