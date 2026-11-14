import React from 'react';

type Room = 'gallery' | 'chess' | 'sports' | 'spaces' | 'arena';

interface RoomSwitcherProps {
  currentRoom: Room;
  onSwitchRoom: (room: Room) => void;
}

const rooms: { id: Room; label: string }[] = [
  { id: 'gallery', label: 'Gallery' },
  { id: 'chess', label: 'Chess' },
  { id: 'sports', label: 'Sports' },
  { id: 'spaces', label: 'MAX Spaces' },
  { id: 'arena', label: 'Chess Arena' },
];

export default function RoomSwitcher({ currentRoom, onSwitchRoom }: RoomSwitcherProps) {
  return (
    <nav aria-label="Spatial rooms" style={{ position: 'fixed', zIndex: 10, left: '50%', bottom: '1.5rem', transform: 'translateX(-50%)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', maxWidth: 'calc(100vw - 1rem)', padding: '0.5rem', background: '#111827e8', border: '1px solid #ffffff20', borderRadius: '999px', backdropFilter: 'blur(12px)' }}>
      {rooms.map((room) => (
        <button
          key={room.id}
          type="button"
          aria-current={currentRoom === room.id ? 'page' : undefined}
          onClick={() => onSwitchRoom(room.id)}
          style={{ background: currentRoom === room.id ? '#7c3aed' : 'transparent', color: '#fff', border: 0, borderRadius: '999px', padding: '0.65rem 1rem', cursor: 'pointer' }}
        >
          {room.label}
        </button>
      ))}
    </nav>
  );
}
