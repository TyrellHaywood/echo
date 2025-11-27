import { supabase } from "@/utils/supabase";
import { Database } from "@/types/supabase";

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

export async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<{ conversation: Conversation | null; isNew: boolean }> {
  try {
    const { data: existingConversations, error: searchError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .or(`user_id.eq.${userId1},user_id.eq.${userId2}`);

    if (searchError) {
      console.error('Error searching for existing conversation:', searchError);
      return { conversation: null, isNew: false };
    }

    if (existingConversations && existingConversations.length > 0) {
      const conversationIds = existingConversations
        .map(cp => cp.conversation_id)
        .filter((id): id is string => id !== null);
      
      const conversationCounts = conversationIds.reduce((acc: Record<string, number>, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sharedConversationId = Object.entries(conversationCounts)
        .find(([_, count]) => count === 2)?.[0];

      if (sharedConversationId) {
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

    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (createError || !newConversation) {
      console.error('Error creating conversation:', createError);
      return { conversation: null, isNew: false };
    }

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConversation.id, user_id: userId1 },
        { conversation_id: newConversation.id, user_id: userId2 }
      ]);

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      await supabase.from('conversations').delete().eq('id', newConversation.id);
      return { conversation: null, isNew: false };
    }

    return { conversation: newConversation, isNew: true };
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    return { conversation: null, isNew: false };
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  postId?: string | null
): Promise<MessageWithSender | null> {
  try {
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

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', senderId)
      .single();

    let postData = null;
    if (postId) {
      const { data } = await supabase
        .from('posts')
        .select('id, title, cover_image_url, _url')
        .eq('id', postId)
        .single();
      postData = data;
    }

    return {
      ...message,
      sender: senderProfile || null,
      post: postData || null
    } as any as MessageWithSender;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return null;
  }
}

export async function getUserConversations(
  userId: string
): Promise<ConversationWithParticipants[]> {
  try {
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

    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (conversationsError || !conversations) {
      console.error('Error fetching conversations:', conversationsError);
      return [];
    }

    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('*')
      .in('conversation_id', conversationIds);

    const allUserIds = [...new Set(allParticipants?.map(p => p.user_id).filter((id): id is string => typeof id === 'string') || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allUserIds);

    const { data: allMessages } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_id, post_id, conversation_id')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const participantsByConv = new Map<string, typeof allParticipants>();
    const messagesByConv = new Map<string, typeof allMessages>();

    allParticipants?.forEach(p => {
      if (!p.conversation_id) return;
      if (!participantsByConv.has(p.conversation_id)) {
        participantsByConv.set(p.conversation_id, []);
      }
      participantsByConv.get(p.conversation_id)?.push(p);
    });

    allMessages?.forEach(m => {
      if (!m.conversation_id) return;
      if (!messagesByConv.has(m.conversation_id)) {
        messagesByConv.set(m.conversation_id, []);
      }
      messagesByConv.get(m.conversation_id)?.push(m);
    });

    return conversations.map(conv => ({
      ...conv,
      conversation_participants: (participantsByConv.get(conv.id) || []).map(p => ({
        ...p,
        profiles: p.user_id ? profileMap.get(p.user_id) || null : null
      })),
      messages: messagesByConv.get(conv.id)?.[0] ? [messagesByConv.get(conv.id)![0]] : []
    })) as ConversationWithParticipants[];
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return [];
  }
}

export async function getConversationMessages(
  conversationId: string
): Promise<MessageWithSender[]> {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching conversation messages:', error);
      return [];
    }

    if (!messages || messages.length === 0) {
      return [];
    }

    const senderIds = [...new Set(messages.map(m => m.sender_id).filter((id): id is string => typeof id === 'string'))];
    const postIds = [...new Set(messages.map(m => m.post_id).filter((id): id is string => typeof id === 'string'))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', senderIds);

    const { data: posts } = await supabase
      .from('posts')
      .select('id, title, cover_image_url, _url')
      .in('id', postIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const postMap = new Map(posts?.map(p => [p.id, p]) || []);

    return messages.map(message => ({
      ...message,
      sender: message.sender_id ? profileMap.get(message.sender_id) || null : null,
      post: message.post_id ? postMap.get(message.post_id) || null : null
    })) as MessageWithSender[];
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return [];
  }
}

export async function getConversation(
  conversationId: string
): Promise<ConversationWithParticipants | null> {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error || !conversation) {
      console.error('Error fetching conversation:', error);
      return null;
    }

    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId);

    if (!participants) {
      return null;
    }

    const userIds = participants.map(p => p.user_id).filter((id): id is string => typeof id === 'string');
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_id, post_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      ...conversation,
      conversation_participants: participants.map(p => ({
        ...p,
        profiles: p.user_id ? profileMap.get(p.user_id) || null : null
      })),
      messages: messages || []
    } as ConversationWithParticipants;
  } catch (error) {
    console.error('Error in getConversation:', error);
    return null;
  }
}

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

export async function getUnreadCount(
  conversationId: string,
  userId: string
): Promise<number> {
  try {
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      return 0;
    }

    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
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

export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<boolean> {
  try {
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

export function getOtherParticipant(
  conversation: ConversationWithParticipants,
  currentUserId: string
): (ConversationParticipant & { profiles: Database['public']['Tables']['profiles']['Row'] | null }) | null {
  const otherParticipant = conversation.conversation_participants.find(
    (p: ConversationParticipant & { profiles: Database['public']['Tables']['profiles']['Row'] | null }) => p.user_id !== currentUserId
  );
  return otherParticipant || null;
}