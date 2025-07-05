"use client";

// Dependencies
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

// Utils
import { formatDate } from "@/utils/dataTransformer";
import { addComment } from "@/utils/postInteractions";
import { supabase } from "@/utils/supabase";
import { Profile } from "@/utils/supabase";

// Shadcn components
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Icons
import { Heart, MessageCircle } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string | null;
  user_id: string | null;
  parent_comment_id: string | null;
  profile?: Profile | null;
  replies?: Comment[];
}

interface CommentsProps {
  postId: string;
}

export default function Comments({ postId }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, Profile>>({});

  // Fetch comments for the post
  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        // Get all user IDs from comments to fetch their profiles
        const userIds = [
          ...new Set(data.map((comment) => comment.user_id).filter(Boolean)),
        ] as string[];

        // Initialize profile map outside the conditional block
        const profileMap: Record<string, Profile> = {};

        // Only fetch profiles if we have user IDs
        if (userIds.length > 0) {
          // Fetch user profiles for all comment authors
          const { data: profiles } = await supabase
            .from("profiles")
            .select("*")
            .in("id", userIds);

          if (profiles) {
            profiles.forEach((profile) => {
              profileMap[profile.id] = profile;
            });
          }

          setUserProfiles(profileMap);
        }

        // Process comments to create a nested structure
        const commentMap: Record<string, Comment> = {};
        const rootComments: Comment[] = [];

        // First pass: map all comments by ID
        data.forEach((comment) => {
          commentMap[comment.id] = { ...comment, replies: [] };
        });

        // Second pass: build the nested structure
        data.forEach((comment) => {
          const commentWithReplies = commentMap[comment.id];

          if (
            comment.parent_comment_id &&
            commentMap[comment.parent_comment_id]
          ) {
            // This is a reply, add it to its parent's replies
            commentMap[comment.parent_comment_id].replies?.push(
              commentWithReplies
            );
          } else {
            // This is a root comment
            rootComments.push(commentWithReplies);
          }

          // Add the author's profile to the comment
          if (comment.user_id && profileMap[comment.user_id]) {
            commentWithReplies.profile = profileMap[comment.user_id];
          }
        });

        setComments(rootComments);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  useEffect(() => {
    fetchComments();

    // Set up real-time subscription for comments
    const commentsSubscription = supabase
      .channel("comments-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, [postId]);

  const handleAddComment = async () => {
    if (!user || !commentText.trim()) return;

    setIsAddingComment(true);

    try {
      await addComment(
        postId,
        user.id,
        commentText,
        replyingTo // Pass the parent comment ID if replying
      );
      setCommentText("");
      setReplyingTo(null);
      await fetchComments();
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setIsAddingComment(false);
    }
  };

  // Recursive component to render a comment and its replies
  const CommentItem = ({ comment }: { comment: Comment }) => {
    return (
      <div className="flex flex-col items-start">
        {/* parent comment */}
        <div className="flex flex-col gap-2">
          {/* author */}
          <div className="mt-3 flex flex-row gap-2 items-center">
            <Avatar
              src={comment.profile?.avatar_url ?? undefined}
              alt={comment.profile?.name || "user"}
            />
            {/* text */}
            <div className="flex flex-row items-center gap-1">
              <span className="text-description font-source-sans">
                {comment.profile?.name || "Anonymous"}
              </span>
              <span className="text-metadata text-muted-foreground font-source-sans">
                {comment.created_at && formatDate(comment.created_at)}
              </span>
            </div>
          </div>

          {/* text */}
          <div className="rounded-md flex flex-row gap-2">
            <Avatar className="invisible" />
            <div className="flex flex-col">
              <p className="text-description whitespace-pre-line font-source-sans">
                {comment.content}
              </p>
              <div className="flex gap-4 mt-2">
                <Button
                  variant="ghost"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground font-source-sans"
                >
                  <Heart />
                  <span className="text-metadata">LIKE</span>
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto p-0 text-muted-foreground hover:text-foreground font-source-sans"
                  onClick={() => setReplyingTo(comment.id)}
                >
                  <MessageCircle />
                  <span className="text-metadata">REPLY</span>
                </Button>
              </div>
            </div>
          </div>
          {/* comment interactions */}
        </div>
        {/* replies */}
        <div className="flex-1">
          {/* Render replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-4 mt-2 border-l-[1px] border-border pl-4 flex flex-col gap-1">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} />
              ))}
            </div>
          )}

          {/* Reply input if replying to this comment */}
          {replyingTo === comment.id && (
            <div className="mt-2 ml-4">
              <div className="flex gap-3">
                <Avatar
                  src={userProfiles[user?.id || ""]?.avatar_url ?? undefined}
                  alt="You"
                  className="w-6 h-6"
                />
                <div className="flex-1">
                  <Textarea
                    placeholder="Write a reply..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[60px] text-description"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={isAddingComment || !commentText.trim()}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-plex-serif mb-4">Comments</h3>

      {/* Comments list */}
      <div className="space-y-6 mb-6">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>

      {/* Add new comment */}
      {!replyingTo && (
        <div className="flex gap-3">
          <Avatar
            src={userProfiles[user?.id || ""]?.avatar_url ?? undefined}
            alt="You"
            className="w-8 h-8"
          />
          <div className="flex-1">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleAddComment}
                disabled={isAddingComment || !commentText.trim() || !user}
              >
                {isAddingComment ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
