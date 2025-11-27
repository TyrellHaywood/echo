import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  getConversationMessages, 
  MessageWithSender,
  markConversationAsRead 
} from '@/utils/messageService';

export function useMessages(conversationId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    async function loadMessages() {
      try {
        setIsLoading(true);
        const data = await getConversationMessages(conversationId as string);
        setMessages(data);
        setError(null);

        if (userId) {
          await markConversationAsRead(conversationId as string, userId);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    }

    loadMessages();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('New message received:', payload);
          const data = await getConversationMessages(conversationId);
          setMessages(data);

          if (userId && payload.new.sender_id !== userId) {
            await markConversationAsRead(conversationId, userId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('Message updated:', payload);
          const data = await getConversationMessages(conversationId);
          setMessages(data);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('Message deleted:', payload);
          const data = await getConversationMessages(conversationId);
          setMessages(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  return { messages, isLoading, error };
}
