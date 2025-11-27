"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useConversations } from "@/hooks/useConversations";
import { getOtherParticipant } from "@/utils/messageService";
import { formatDate } from "@/utils/dataTransformer";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { X } from "lucide-react";

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { conversations, isLoading, error } = useConversations(user?.id || null);

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
              onClick={() => router.push("/")}
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
              onClick={() => router.push("/")}
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

  return (
    <div className="w-screen h-screen sm:p-4">
      <div className="w-full h-full p-4 pb-[100px] flex flex-col gap-9 rounded-md sm:bg-[#F2F2F2]/75 overflow-hidden">
        <div className="flex flex-row justify-between items-center">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => router.push("/")}
            className="sm:bg-[#e5e5e5] backdrop-blur-md shadow-inner"
          >
            <X />
          </Button>
          <span className="text-title font-plex-serif">Messages</span>
          <div className="w-10" />
        </div>

        <Separator />

        <div className="w-full overflow-auto h-full">
          <div className="w-full sm:w-2/3 lg:w-1/2 h-full m-auto flex flex-col gap-3">
            {conversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-description font-source-sans">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation, user.id);
                const lastMessage = conversation.messages[0];

                return (
                  <button
                    key={conversation.id}
                    onClick={() => router.push(`/messages/${conversation.id}`)}
                    className="w-full p-4 flex flex-row gap-3 items-center rounded-lg bg-background/50 backdrop-blur-md shadow-inner hover:bg-background/70 transition-colors"
                  >
                    <Avatar
                      src={otherParticipant?.profiles?.avatar_url ?? undefined}
                      alt={otherParticipant?.profiles?.name || "User"}
                      className="w-12 h-12"
                    />
                    <div className="flex-1 flex flex-col items-start text-left">
                      <span className="text-description font-source-sans font-medium">
                        {otherParticipant?.profiles?.name || "Unknown User"}
                      </span>
                      {lastMessage && (
                        <span className="text-sub-description font-source-sans text-muted-foreground truncate w-full">
                          {lastMessage.content}
                        </span>
                      )}
                    </div>
                    {lastMessage && (
                      <span className="text-metadata font-source-sans text-muted-foreground uppercase">
                        {formatDate(lastMessage.created_at || "")}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}