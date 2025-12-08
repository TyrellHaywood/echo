import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  online_at: string;
}

export function usePresence(projectId: string | null, currentUserId: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!projectId || !currentUserId) {
      return;
    }

    // Fetch current user profile
    const setupPresence = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', currentUserId)
        .single();

      if (!profile) return;

      const presenceChannel = supabase.channel(`project-presence-${projectId}`, {
        config: {
          presence: {
            key: currentUserId,
          },
        },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const users: PresenceUser[] = [];

          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[];
            presences.forEach((presence) => {
              if (presence.userId !== currentUserId) {
                users.push({
                  userId: presence.userId,
                  name: presence.name,
                  avatarUrl: presence.avatarUrl,
                  online_at: presence.online_at,
                });
              }
            });
          });

          setOnlineUsers(users);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              userId: currentUserId,
              name: profile.name,
              avatarUrl: profile.avatar_url,
              online_at: new Date().toISOString(),
            });
          }
        });

      setChannel(presenceChannel);
    };

    setupPresence();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [projectId, currentUserId]);

  return { onlineUsers };
}