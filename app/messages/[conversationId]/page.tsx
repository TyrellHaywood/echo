"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useMessages } from "@/hooks/useMessages";
import { 
  getConversation, 
  sendMessage, 
  getOtherParticipant 
} from "@/utils/messageService";
import { formatDate } from "@/utils/dataTransformer";
import type { ConversationWithParticipants } from "@/utils/messageService";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { X, Send } from "lucide-react";
import { toast } from "sonner";

export default function MessageThreadPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const conversationId = params?.conversationId as string | undefined;

  const { messages, isLoading, error } = useMessages(conversationId || null, user?.id || null);
  const [conversation, setConversation] = useState<ConversationWithParticipants | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function loadConversation() {
      if (!conversationId) return;
      const data = await getConversation(conversationId);
      setConversation(data);
    }
    loadConversation();
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!user || !conversationId || !messageText.trim()) return;

    try {
      setIsSending(true);
      const sentMessage = await sendMessage(conversationId, user.id, messageText);
      
      if (sentMessage) {
        setMessageText("");
      } else {
        toast.error("Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) {
    return (
      <div className="w-screen h-screen sm:p-4 flex items-center justify-center">
        <div className="text-description font-source-sans">
          Please sign in to view messages
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-screen h-screen sm:p-4">
        <div className="w-full h-full p-4 flex flex-col gap-9 rounded-md sm:bg-[#F2F2F2]/75">
          <div className="flex flex-row justify-between">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => router.push("/messages")}
              className="sm:bg-[#e5e5e5] backdrop-blur-md shadow-inner"
            >
              <X />
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size={32} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen sm:p-4">
        <div className="w-full h-full p-4 flex flex-col gap-9 rounded-md sm:bg-[#F2F2F2]/75">
          <div className="flex flex-row justify-between">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => router.push("/messages")}
              className="sm:bg-[#e5e5e5] backdrop-blur-md shadow-inner"
            >
              <X />
            </Button>
          </div>
          <Separator />
          <div className="text-red-500 text-center">{error}</div>
        </div>
      </div>
    );
  }

  const otherParticipant = conversation ? getOtherParticipant(conversation, user.id) : null;

  return (
    <div className="w-screen h-screen sm:p-4">
      <div className="w-full h-full p-4 pb-4 flex flex-col gap-4 rounded-md sm:bg-[#F2F2F2]/75 overflow-hidden">
        <div className="flex flex-row justify-between items-center">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => router.push("/messages")}
            className="sm:bg-[#e5e5e5] backdrop-blur-md shadow-inner"
          >
            <X />
          </Button>
          
          <div className="flex flex-row gap-2 items-center">
            <Avatar
              src={otherParticipant?.profiles?.avatar_url ?? undefined}
              alt={otherParticipant?.profiles?.name || "User"}
              className="w-8 h-8"
            />
            <span className="text-description font-source-sans font-medium">
              {otherParticipant?.profiles?.name || "Unknown User"}
            </span>
          </div>

          <div className="w-10" />
        </div>

        <Separator />

        <div className="flex-1 overflow-auto px-4">
          <div className="w-full sm:w-2/3 lg:w-1/2 m-auto flex flex-col gap-3 py-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-description font-source-sans">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender_id === user.id;
                
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-1 ${
                      isOwnMessage ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-background/50 backdrop-blur-md shadow-inner"
                      }`}
                    >
                      <p className="text-description font-source-sans whitespace-pre-wrap break-words">
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

        <Separator />

        <div className="flex flex-row gap-2 items-end px-4">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 min-h-[44px] max-h-[120px] p-3 rounded-lg bg-background/50 backdrop-blur-md shadow-inner resize-none text-description font-source-sans focus:outline-none focus:ring-2 focus:ring-ring"
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