'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Send } from 'lucide-react';
import { useProjectMessages, sendProjectMessage } from '@/hooks/useProjectMessages';
import { formatDate } from '@/utils/dataTransformer';
import { toast } from 'sonner';

interface ProjectChatProps {
  projectId: string;
  currentUserId: string;
}

export function ProjectChat({ projectId, currentUserId }: ProjectChatProps) {
  const { messages, isLoading, error } = useProjectMessages(projectId, currentUserId);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      setIsSending(true);
      const sentMessage = await sendProjectMessage(projectId, currentUserId, messageText);

      if (sentMessage) {
        setMessageText('');
      } else {
        toast.error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center text-sub-description font-source-sans p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sub-description font-source-sans">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex flex-col gap-1 ${
                    isOwnMessage ? 'items-end' : 'items-start'
                  }`}
                >
                  {!isOwnMessage && (
                    <div className="flex flex-row gap-2 items-center px-2">
                      <Avatar
                        src={message.sender?.avatar_url ?? undefined}
                        alt={message.sender?.name || 'User'}
                        className="w-5 h-5"
                      />
                      <span className="text-metadata font-source-sans text-muted-foreground">
                        {message.sender?.name || 'Unknown User'}
                      </span>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sub-description font-source-sans whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                  <span className="text-metadata font-source-sans text-muted-foreground uppercase px-2">
                    {message.created_at && formatDate(message.created_at)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3">
        <div className="flex flex-row gap-2 items-end">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 min-h-[44px] max-h-[120px] p-2 rounded-lg bg-muted resize-none text-sub-description font-source-sans focus:outline-none focus:ring-2 focus:ring-ring"
            rows={1}
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            size="icon"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSending ? <LoadingSpinner size={20} /> : <Send size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
}