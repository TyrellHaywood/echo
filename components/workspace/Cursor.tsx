'use client';

import { Avatar } from '@/components/ui/avatar';
import Image from 'next/image';

interface CursorProps {
  x: number;
  y: number;
  name: string | null;
  avatarUrl: string | null;
  color: string;
}

export function Cursor({ x, y, name, avatarUrl, color }: CursorProps) {
  if (x < 0 || y < 0) {
    return null;
  }

  return (
    <div
      className="absolute pointer-events-none z-[9999]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.3))` }}>
        <Image
          src="/cursor.svg"
          alt="cursor"
          width={11}
          height={15}
        />
      </div>

      <div
        className="absolute left-4 top-0 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap flex items-center gap-1 shadow-lg"
        style={{
          backgroundColor: color,
          color: 'white',
        }}
      >
        {avatarUrl && (
          <Avatar
            src={avatarUrl}
            alt={name || 'User'}
            className="w-4 h-4 border border-white/30"
          />
        )}
        <span>{name || 'Anonymous'}</span>
      </div>
    </div>
  );
}