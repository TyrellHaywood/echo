import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export interface ProjectMessage {
  id: string;
  post_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useProjectMessages(projectId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    async function loadMessages() {
    try {
        setIsLoading(true);

        if (!projectId) {
        setMessages([]);
        setIsLoading(false);
        return;
        }
        
        // First, get the messages
        const { data, error: fetchError } = await supabase
        .from('project_messages')
        .select('*')
        .eq('post_id', projectId as string)
        .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        if (!data || data.length === 0) {
        setMessages([]);
        setError(null);
        return;
        }

        // Get unique sender IDs
        const senderIds = [...new Set(data.map(msg => msg.sender_id))].filter((id): id is string => id !== null);
        
        // Fetch all sender profiles
        const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', senderIds);

        if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        }

        // Map messages with their sender profiles
        const mappedMessages: ProjectMessage[] = data
        .filter((msg: any) => msg.post_id && msg.sender_id && msg.created_at)
        .map((msg: any) => ({
            id: msg.id,
            post_id: msg.post_id,
            sender_id: msg.sender_id,
            content: msg.content,
            created_at: msg.created_at,
            sender: profiles?.find(p => p.id === msg.sender_id) || null,
        }));

        setMessages(mappedMessages);
        setError(null);
    } catch (err) {
        console.error('Error loading project messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
        setIsLoading(false);
    }
    }

    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `post_id=eq.${projectId}`,
        },
        async (payload) => {
          console.log('New project message received:', payload);
          
          // Only process if required fields exist
          if (!payload.new.post_id || !payload.new.sender_id || !payload.new.created_at) {
            return;
          }
          
          // Fetch the sender profile for the new message
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage: ProjectMessage = {
            id: (payload.new as any).id,
            post_id: (payload.new as any).post_id,
            sender_id: (payload.new as any).sender_id,
            content: (payload.new as any).content,
            created_at: (payload.new as any).created_at,
            sender: senderData || null,
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, userId]);

  return { messages, isLoading, error };
}

export async function sendProjectMessage(
  projectId: string,
  senderId: string,
  content: string
): Promise<ProjectMessage | null> {
  try {
    const { data: message, error: messageError } = await supabase
      .from('project_messages')
      .insert({
        post_id: projectId,
        sender_id: senderId,
        content: content.trim(),
      })
      .select()
      .single();

    if (messageError || !message) {
      console.error('Error sending project message:', messageError);
      return null;
    }

    // Ensure we have the required fields
    if (!message.post_id || !message.sender_id || !message.created_at) {
      console.error('Missing required fields in message response');
      return null;
    }

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', senderId)
      .single();

    return {
      id: message.id,
      post_id: message.post_id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      sender: senderProfile || null,
    };
  } catch (error) {
    console.error('Error in sendProjectMessage:', error);
    return null;
  }
}