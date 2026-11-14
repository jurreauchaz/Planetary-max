import React, { useState } from 'react';
import GalleryPage from './pages/GalleryPage';
import ChessPage from './pages/ChessPage';
import SportsPage from './pages/SportsPage';
import RoomSwitcher from './components/RoomSwitcher';
import { PortalMasterSpaces } from '../components/PortalMasterSpaces';
import MaxChessArenaPage from '../pages/MaxChessArenaPage';

type Room = 'gallery' | 'chess' | 'sports' | 'spaces' | 'arena';

export default function App() {
  const [currentRoom, setCurrentRoom] = useState<Room>('gallery');

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#0a0a0c', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      {currentRoom === 'spaces' ? (
        <main style={{ minHeight: '100vh', overflowY: 'auto', padding: '1px 0 2rem' }}><PortalMasterSpaces /></main>
      ) : currentRoom === 'arena' ? (
        <main style={{ minHeight: '100vh', overflowY: 'auto', padding: '1px 0 5rem' }}><MaxChessArenaPage /></main>
      ) : (
        <main
          key={currentRoom}
          style={{ width: '100%', minHeight: '100vh', animation: 'room-enter 0.4s ease-in-out', overflowY: 'auto' }}
        >
          {currentRoom === 'gallery' && <GalleryPage />}
          {currentRoom === 'chess' && <ChessPage />}
          {currentRoom === 'sports' && <SportsPage />}
        </main>
      )}
      <style>{`@keyframes room-enter { from { opacity: 0.72; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } @media (prefers-reduced-motion: reduce) { main { animation: none !important; } }`}</style>
      <RoomSwitcher currentRoom={currentRoom} onSwitchRoom={setCurrentRoom} />
    </div>
  );
}
