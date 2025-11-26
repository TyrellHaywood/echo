import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { getUserConversations, ConversationWithParticipants } from '@/utils/messageService';

export function useConversations(userId: string | null) {
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    async function loadConversations() {
      try {
        setIsLoading(true);
        const data = await getUserConversations(userId as string);
        setConversations(data);
        setError(null);
      } catch (err) {
        console.error('Error loading conversations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    }

    loadConversations();

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('Message change detected:', payload);
          const data = await getUserConversations(userId);
          setConversations(data);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        async (payload) => {
          console.log('Conversation change detected:', payload);
          const data = await getUserConversations(userId);
          setConversations(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { conversations, isLoading, error };
}