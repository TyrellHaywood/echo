import { supabase } from "@/utils/supabase";
import {Database} from "@/types/supabase";

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row'];

export type ConversationWithParticipants = Conversation & {
  conversation_participants: (ConversationParticipant & {
    profiles: Database['public']['Tables']['profiles']['Row'] | null;
  })[];
  messages: Message[];
};

export type MessageWithSender = Message & {
  sender: Database['public']['Tables']['profiles']['Row'] | null;
  post: Database['public']['Tables']['posts']['Row'] | null;
};

/**
 * Get or create a conversation between two users
 * If conversation exists, returns it. If not, creates a new one.
 */
export async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<{ conversation: Conversation | null; isNew: boolean }> {
  try {
    // First, check if a conversation already exists between these two users
    const { data: existingConversations, error: searchError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .or(`user_id.eq.${userId1},user_id.eq.${userId2}`);

    if (searchError) {
      console.error('Error searching for existing conversation:', searchError);
      return { conversation: null, isNew: false };
    }

    // Find conversations that have both users
    if (existingConversations && existingConversations.length > 0) {
    const conversationIds = existingConversations
      .map(cp => cp.conversation_id)
      .filter((id): id is string => id !== null);
    
    // Count participants per conversation
    const conversationCounts = conversationIds.reduce((acc: Record<string, number>, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

      // Find conversations with exactly 2 participants (both users)
      const sharedConversationId = Object.entries(conversationCounts)
        .find(([_, count]) => count === 2)?.[0];

      if (sharedConversationId) {
        // Fetch the full conversation
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', sharedConversationId)
          .single();

        if (convError) {
          console.error('Error fetching conversation:', convError);
          return { conversation: null, isNew: false };
        }

        return { conversation, isNew: false };
      }
    }

    // No existing conversation found, create a new one
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (createError || !newConversation) {
      console.error('Error creating conversation:', createError);
      return { conversation: null, isNew: false };
    }

    // Add both users as participants
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConversation.id, user_id: userId1 },
        { conversation_id: newConversation.id, user_id: userId2 }
      ]);

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      // Clean up the conversation if we couldn't add participants
      await supabase.from('conversations').delete().eq('id', newConversation.id);
      return { conversation: null, isNew: false };
    }

    return { conversation: newConversation, isNew: true };
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    return { conversation: null, isNew: false };
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  postId?: string | null
): Promise<MessageWithSender | null> {
  try {
    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        post_id: postId || null
      })
      .select()
      .single();

    if (messageError || !message) {
      console.error('Error sending message:', messageError);
      return null;
    }

    // Update conversation's last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Fetch the message with sender profile and post
    const { data: messageWithSender, error: fetchError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          username,
          avatar_url,
          full_name
        ),
        post:post_id (
          id,
          title,
          cover_image_url,
          _url
        )
      `)
      .eq('id', message.id)
      .single();

    if (fetchError) {
      console.error('Error fetching message with sender:', fetchError);
      return null;
    }

    return messageWithSender as any as MessageWithSender;;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return null;
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string
): Promise<ConversationWithParticipants[]> {
  try {
    // Get all conversation IDs the user is part of
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (participantError || !participantData) {
      console.error('Error fetching user conversations:', participantError);
      return [];
    }

    const conversationIds = participantData
      .map(p => p.conversation_id)
      .filter((id): id is string => id !== null);

    if (conversationIds.length === 0) {
      return [];
    }

    // Fetch conversations with participants and last message
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants (
          *,
          profiles:user_id (
            id,
            username,
            avatar_url,
            full_name
          )
        ),
        messages (
          id,
          content,
          created_at,
          sender_id,
          post_id
        )
      `)
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return [];
    }

    // Filter to only get the last message for each conversation
    const conversationsWithLastMessage = (conversations || []).map(conv => ({
      ...conv,
      messages: (conv.messages && conv.messages.length > 0)
        ? [(conv.messages as Message[]).sort((a: Message, b: Message) => 
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )[0]]
        : []
    }));

    return conversationsWithLastMessage as any as ConversationWithParticipants[];
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return [];
  }
}

/**
 * Get all messages in a conversation
 */
export async function getConversationMessages(
  conversationId: string
): Promise<MessageWithSender[]> {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          username,
          avatar_url,
          full_name
        ),
        post:post_id (
          id,
          title,
          cover_image_url,
          _url
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching conversation messages:', error);
      return [];
    }

    return (messages || []) as any as MessageWithSender[];
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return [];
  }
}

/**
 * Get a single conversation with participants
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationWithParticipants | null> {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants (
          *,
          profiles:user_id (
            id,
            username,
            avatar_url,
            full_name
          )
        ),
        messages (
          id,
          content,
          created_at,
          sender_id,
          post_id
        )
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }

    return conversation as any as ConversationWithParticipants;
  } catch (error) {
    console.error('Error in getConversation:', error);
    return null;
  }
}

/**
 * Mark messages as read for a user
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking conversation as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markConversationAsRead:', error);
    return false;
  }
}

/**
 * Get unread message count for a conversation
 */
export async function getUnreadCount(
  conversationId: string,
  userId: string
): Promise<number> {
  try {
    // Get user's last_read_at timestamp
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      return 0;
    }

    // Count messages after last_read_at
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId) // Don't count user's own messages
      .gt('created_at', participant.last_read_at || '1970-01-01');

    if (countError) {
      console.error('Error counting unread messages:', countError);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return 0;
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<boolean> {
  try {
    // Verify the user is the sender
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message || message.sender_id !== userId) {
      console.error('Cannot delete message - not authorized');
      return false;
    }

    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMessage:', error);
    return false;
  }
}

/**
 * Get the other participant in a 1:1 conversation
 */
export function getOtherParticipant(
  conversation: ConversationWithParticipants,
  currentUserId: string
): (ConversationParticipant & { profiles: Database['public']['Tables']['profiles']['Row'] | null }) | null {
  const otherParticipant = conversation.conversation_participants.find(
    (p: ConversationParticipant & { profiles: Database['public']['Tables']['profiles']['Row'] | null }) => p.user_id !== currentUserId
  );
  return otherParticipant || null;
}