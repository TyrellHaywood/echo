"use client";

// Dependencies
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

// Utils
import { formatDate } from "@/utils/dataTransformer";
import {
  addComment,
  PostWithInteractions,
  checkUserLikedComment,
  toggleCommentLike,
} from "@/utils/postInteractions";
import { supabase } from "@/utils/supabase";
import { Profile } from "@/utils/supabase";

// Shadcn components
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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
  likes?: { id: string; user_id: string }[];
}

interface CommentsProps {
  postId: string;
  post?: PostWithInteractions | null;
}

// Move CommentItem outside the main component
const CommentItem = ({
  comment,
  replyingTo,
  setReplyingTo,
  commentText,
  setCommentText,
  handleAddComment,
  isAddingComment,
  userProfiles,
  user,
  replyTextareaRef,
  handleCommentLike,
  userLikedComments,
  currentUserProfile,
}: {
  comment: Comment;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  commentText: string;
  setCommentText: (text: string) => void;
  handleAddComment: () => Promise<void>;
  isAddingComment: boolean;
  userProfiles: Record<string, Profile>;
  user: any;
  replyTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleCommentLike: (commentId: string) => Promise<void>;
  userLikedComments: Record<string, boolean>;
  currentUserProfile: Profile | null;
}) => {
  const isReplying = replyingTo === comment.id;
  const isLiked = userLikedComments[comment.id] || false;

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
            <HoverCard>
              <HoverCardTrigger>
                <Link
                  href={`/${comment.profile?.username || ""}`}
                  className="text-description font-source-sans pointer-events-pointer hover:underline"
                >
                  {comment.profile?.name}
                </Link>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="mt-3 flex flex-row gap-2 items-center">
                  <Avatar
                    src={comment.profile?.avatar_url ?? undefined}
                    alt={comment.profile?.name || "user_id"}
                  />
                  {/* text */}
                  <div className="flex flex-col">
                    <span className="text-description font-source-sans">
                      {comment.profile?.name}
                    </span>
                    <span className="text-metadata font-source-sans">
                      {comment.profile?.bio}
                    </span>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
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
                className={`h-auto p-0 hover:bg-transparent ${
                  isLiked
                    ? "text-red-500 hover:text-red-500"
                    : "text-muted-foreground hover:text-foreground"
                } font-source-sans`}
                onClick={() => handleCommentLike(comment.id)}
              >
                <Heart className={isLiked ? "fill-current" : ""} />
                <div className="flex flex-row items-center gap-1">
                  <span className="text-metadata">
                    {isLiked ? "LIKED" : "LIKE"}
                  </span>
                  {comment.likes && comment.likes.length > 0 && (
                    <span className="text-metadata">
                      ({comment.likes.length})
                    </span>
                  )}
                </div>
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
              <CommentItem
                key={reply.id}
                comment={reply}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                commentText={commentText}
                setCommentText={setCommentText}
                handleAddComment={handleAddComment}
                isAddingComment={isAddingComment}
                userProfiles={userProfiles}
                user={user}
                replyTextareaRef={replyTextareaRef}
                handleCommentLike={handleCommentLike}
                userLikedComments={userLikedComments}
                currentUserProfile={currentUserProfile}
              />
            ))}
          </div>
        )}

        {/* Reply input if replying to this comment */}
        {isReplying && (
          <div className="mt-2 ml-4">
            <div className="flex gap-3">
              <Avatar
                src={currentUserProfile?.avatar_url ?? undefined}
                alt="You"
                className="w-6 h-6"
              />
              <div className="flex-1">
                <Textarea
                  ref={replyTextareaRef}
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

export default function Comments({ postId, post }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, Profile>>({});
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    null
  );

  const [userLikedComments, setUserLikedComments] = useState<
    Record<string, boolean>
  >({});

  // Add ref for reply textarea
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when replying to a comment
  useEffect(() => {
    if (replyingTo && replyTextareaRef.current) {
      // Small timeout to ensure the element is in the DOM
      setTimeout(() => {
        replyTextareaRef.current?.focus();
      }, 0);
    }
  }, [replyingTo]);

  // Fetch current user's profile
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setCurrentUserProfile(data);
      } catch (err) {
        console.error("Error fetching current user profile:", err);
      }
    };

    if (user) {
      fetchCurrentUserProfile();
    }
  }, [user]);

  // Fetch comments for the post
  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(
          `
        *,
        comment_likes (
          id,
          user_id
        )
      `
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        // Process the comments as before
        // Add the likes to each comment
        const userIds = [
          ...new Set(data.map((comment) => comment.user_id).filter(Boolean)),
        ] as string[];

        // Initialize profile map outside the conditional block
        const profileMap: Record<string, Profile> = {};

        // Only fetch profiles if we have user IDs
        if (userIds.length > 0) {
          // Fetch user profiles as before
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
          commentMap[comment.id] = {
            ...comment,
            replies: [],
            likes: comment.comment_likes || [],
          };
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

    // Set up real-time subscription for comments and comment_likes
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_likes",
        },
        () => {
          fetchComments();
          checkUserCommentLikes();
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

  // Check which comments the current user has liked
  const checkUserCommentLikes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const likedComments: Record<string, boolean> = {};
      if (data) {
        data.forEach((like) => {
          likedComments[like.comment_id] = true;
        });
      }

      setUserLikedComments(likedComments);
    } catch (err) {
      console.error("Error checking user comment likes:", err);
    }
  };

  useEffect(() => {
    if (user) {
      checkUserCommentLikes();
    }
  }, [user]);

  // Handle comment like toggle
  const handleCommentLike = async (commentId: string) => {
    if (!user) return;

    try {
      const result = await toggleCommentLike(commentId, user.id);

      // Update the local state
      setUserLikedComments((prev) => ({
        ...prev,
        [commentId]: result.liked,
      }));

      // Refresh comments to update like counts
      await fetchComments();
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  return (
    <div className="w-full">
      {/* title */}
      <div className="flex flex-row gap-2 items-center mb-4 text-foreground text-lg font-plex-serif">
        {(post?.comments?.length ?? 0) > 0 && (
          <span>{post?.comments?.length ?? 0}</span>
        )}
        <h3>Comments</h3>
      </div>
      {/* Add new comment */}
      {!replyingTo && (
        <div className="flex gap-3">
          <Avatar
            src={currentUserProfile?.avatar_url ?? undefined}
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

      {/* Comments list */}
      <div className="space-y-6 mb-6">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              commentText={commentText}
              setCommentText={setCommentText}
              handleAddComment={handleAddComment}
              isAddingComment={isAddingComment}
              userProfiles={userProfiles}
              user={user}
              replyTextareaRef={replyTextareaRef}
              handleCommentLike={handleCommentLike}
              userLikedComments={userLikedComments}
              currentUserProfile={currentUserProfile}
            />
          ))
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
}
