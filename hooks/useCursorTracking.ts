import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { throttle } from 'lodash';

export interface CursorPosition {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  x: number;
  y: number;
  color: string;
}

const CURSOR_COLORS = [
  '#e09145', '#46b1c9', '#e17878', '#7ba05b', '#9b72b0', '#d4a259',
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e'
];

export function useCursorTracking(
  projectId: string | null,
  currentUserId: string | null,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [userColor, setUserColor] = useState<string>('');

  useEffect(() => {
    if (!projectId || !currentUserId) {
      return;
    }

    // Wait for container to be ready
    const checkContainer = () => {
      if (!containerRef.current) {
        requestAnimationFrame(checkContainer);
        return;
      }

      setupCursorTracking();
    };

    const setupCursorTracking = async () => {
      const container = containerRef.current;
      if (!container) return;

      // Fetch current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', currentUserId)
        .single();

      if (!profile) return;

      // Assign a color based on user ID (consistent across sessions)
      const colorIndex = parseInt(currentUserId.slice(0, 8), 16) % CURSOR_COLORS.length;
      const color = CURSOR_COLORS[colorIndex];
      setUserColor(color);

      const cursorChannel = supabase.channel(`cursors-${projectId}`, {
        config: {
          presence: {
            key: currentUserId,
          },
        },
      });

      cursorChannel
        .on('presence', { event: 'sync' }, () => {
          const state = cursorChannel.presenceState();
          const newCursors = new Map<string, CursorPosition>();

          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[];
            presences.forEach((presence) => {
              if (presence.userId !== currentUserId) {
                newCursors.set(presence.userId, {
                  userId: presence.userId,
                  name: presence.name,
                  avatarUrl: presence.avatarUrl,
                  x: presence.x || 0,
                  y: presence.y || 0,
                  color: presence.color || '#666',
                });
              }
            });
          });

          setCursors(newCursors);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await cursorChannel.track({
              userId: currentUserId,
              name: profile.name,
              avatarUrl: profile.avatar_url,
              x: 100,
              y: 100,
              color,
            });
          }
        });

      setChannel(cursorChannel);

      // Throttled cursor update function
      const updateCursor = throttle(async (x: number, y: number) => {
        if (cursorChannel && cursorChannel.state === 'joined') {
          await cursorChannel.track({
            userId: currentUserId,
            name: profile.name,
            avatarUrl: profile.avatar_url,
            x,
            y,
            color,
          });
        }
      }, 50);

      // Mouse move handler
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        updateCursor(x, y);
      };

      // Mouse leave handler
      const handleMouseLeave = () => {
        updateCursor(-100, -100);
      };

      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
        updateCursor.cancel();
        cursorChannel.unsubscribe();
      };
    };

    checkContainer();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [projectId, currentUserId]);

  return { cursors, userColor };
}