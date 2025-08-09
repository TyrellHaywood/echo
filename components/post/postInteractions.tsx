"use client";

// Dependencies
import { useState } from "react";

// Utils
import type { PostWithInteractions } from "@/utils/postInteractions";
import { getPostAudioUrl } from "@/utils/postInteractions";

// Shadcn Components
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Icons
import { Heart, MessageCircle, Send, Download } from "lucide-react";

// Components
import EchoDialog from "@/components/post/Echo";

interface PostInteractionsProps {
  post: PostWithInteractions | null;
  loadPost: () => void;
  userLiked: boolean;
  handleLike: () => void;
  showComments: boolean;
  setShowComments: (value: boolean) => void;
}

export default function PostInteractions({
  post,
  loadPost,
  userLiked,
  handleLike,
  showComments,
  setShowComments,
}: PostInteractionsProps) {
  return (
    <Menubar className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-1/3 m-auto flex justify-between px-3 py-6 rounded-full bg-background/50 backdrop-blur-md shadow-inner">
      <MenubarMenu>
        {/* Echo button */}
        {post && (
          <EchoDialog
            parentPost={{
              id: post.id,
              title: post.title,
              _url: post._url,
              cover_image_url: post.cover_image_url || undefined,
              user_id: post.user_id || undefined,
              children_ids: post.children_ids || undefined,
            }}
            onSuccess={() => {
              toast.success("Echo created successfully!");
              // Reload the post data
              loadPost();
            }}
          />
        )}

        {/* Like post */}
        <Button
          variant="ghost"
          onClick={handleLike}
          className={`flex items-center gap-2 hover:bg-transparent  ${
            userLiked ? "text-red-500 hover:text-red-500" : "hover:opacity-70"
          }`}
          title="Like"
        >
          <Heart className={`!w-6 !h-6  ${userLiked ? "fill-current" : ""}`} />
          {(post?.likes?.length ?? 0) > 0 && (
            <span className="text-foreground">{post?.likes?.length ?? 0}</span>
          )}
        </Button>
        {/* Comment */}
        <Button
          variant="ghost"
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-2 hover:bg-transparent ${
            showComments ? "text-primary" : "hover:opacity-70"
          }`}
          title={showComments ? "Hide comments" : "Show comments"}
        >
          <MessageCircle
            className={`!w-6 !h-6 ${
              showComments ? "fill-background stroke-primary" : ""
            }`}
          />
          {(post?.comments?.length ?? 0) > 0 && (
            <span className="text-foreground">
              {post?.comments?.length ?? 0}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          className="hover:bg-transparent hover:opacity-70"
          onClick={() => {
            // generate current url and copy it to clipboard
            const postUrl = `${window.location.origin}/post/${post?.id}`;
            navigator.clipboard.writeText(postUrl);
            toast.success("Post URL copied to clipboard!");
          }}
        >
          <Send className="!w-6 !h-6" />
        </Button>
        <Button
          variant="ghost"
          className="hover:bg-transparent hover:opacity-70"
          onClick={async () => {
            if (post?._url) {
              try {
                const audioUrl = await getPostAudioUrl(post);
                if (audioUrl) {
                  // Fetch the file as a blob to force download
                  const response = await fetch(audioUrl);
                  if (!response.ok)
                    throw new Error("Failed to fetch audio file");

                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);

                  const link = document.createElement("a");
                  link.href = blobUrl;
                  link.download = `${post.title || "audio"}.mp3`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);

                  // Clean up the blob URL
                  URL.revokeObjectURL(blobUrl);
                } else {
                }
              } catch (error) {
                toast.error("Failed to download audio file");
              }
            } else {
              toast.error("Audio file not available for download");
            }
          }}
        >
          <Download className="!w-6 !h-6" />
        </Button>
      </MenubarMenu>
    </Menubar>
  );
}
