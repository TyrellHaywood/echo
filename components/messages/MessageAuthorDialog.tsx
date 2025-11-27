"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getOrCreateConversation, sendMessage } from "@/utils/messageService";
import { Database } from "@/types/supabase";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface MessageAuthorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  author: Profile | null;
}

export default function MessageAuthorDialog({
  isOpen,
  onClose,
  post,
  author,
}: MessageAuthorDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (!user || !author || !messageText.trim()) return;

    if (user.id === author.id) {
      toast.error("You can't message yourself!");
      return;
    }

    try {
      setIsSending(true);

      const { conversation, isNew } = await getOrCreateConversation(
        user.id,
        author.id
      );

      if (!conversation) {
        toast.error("Failed to create conversation");
        return;
      }

      const sentMessage = await sendMessage(
        conversation.id,
        user.id,
        messageText,
        post.id
      );

      if (sentMessage) {
        toast.success("Message sent!");
        onClose();
        router.push(`/messages/${conversation.id}`);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-title font-plex-serif">
            Message {author?.name || "Author"}
          </DialogTitle>
          <DialogDescription className="text-sub-description font-source-sans">
            Start a conversation about this post
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-lg bg-background/50 backdrop-blur-md shadow-inner">
            <div className="flex flex-row gap-2 items-center mb-2">
              <Avatar
                src={author?.avatar_url ?? undefined}
                alt={author?.name || "Author"}
                className="w-8 h-8"
              />
              <span className="text-sub-description font-source-sans font-medium">
                {author?.name || "Unknown"}
              </span>
            </div>
            <span className="text-description font-plex-serif line-clamp-1">
              {post.title}
            </span>
          </div>

          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Your message..."
            className="min-h-[100px] p-3 rounded-lg bg-background/50 backdrop-blur-md shadow-inner resize-none text-description font-source-sans focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            disabled={isSending}
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSending}
              className="bg-background/50 backdrop-blur-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || isSending}
              className="bg-primary text-primary-foreground"
            >
              {isSending ? <LoadingSpinner size={20} /> : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}