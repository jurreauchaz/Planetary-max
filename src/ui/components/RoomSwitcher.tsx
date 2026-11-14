import React from 'react';

type Room = 'gallery' | 'chess' | 'sports';

interface RoomSwitcherProps {
  currentRoom: Room;
  onSwitchRoom: (room: Room) => void;
}

const rooms: { id: Room; label: string }[] = [
  { id: 'gallery', label: 'Gallery' },
  { id: 'chess', label: 'Chess' },
  { id: 'sports', label: 'Sports' },
];

export default function RoomSwitcher({ currentRoom, onSwitchRoom }: RoomSwitcherProps) {
  return (
    <nav aria-label="Spatial rooms" style={{ position: 'fixed', zIndex: 10, left: '50%', bottom: '1.5rem', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem', padding: '0.5rem', background: 'rgba(18, 18, 22, 0.94)', border: '1px solid #30303a', borderRadius: '999px', boxShadow: '0 12px 40px rgba(0,0,0,.4)' }}>
      {rooms.map((room) => (
        <button
          key={room.id}
          type="button"
          aria-current={currentRoom === room.id ? 'page' : undefined}
          onClick={() => onSwitchRoom(room.id)}
          style={{ background: currentRoom === room.id ? '#3b82f6' : 'transparent', color: '#fff', border: 0, borderRadius: '999px', padding: '0.65rem 1rem', cursor: 'pointer' }}
        >
          {room.label}
        </button>
      ))}
    </nav>
  );
}
