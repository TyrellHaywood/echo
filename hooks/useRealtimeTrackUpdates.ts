import { useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export function useRealtimeTrackUpdates(
  projectId: string | null,
  onTrackUpdate: () => void
) {
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`tracks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracks',
          filter: `post_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('Track update received:', payload);
          onTrackUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, onTrackUpdate]);
}