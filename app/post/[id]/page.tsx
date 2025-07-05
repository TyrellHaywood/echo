"use client";

// Dependencies
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Database } from "@/types/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// Utils
import { formatDate } from "@/utils/dataTransformer";
import { supabase } from "@/utils/supabase";
import {
  fetchPostById,
  getPostWithInteractions,
  toggleLike,
  addComment,
  checkUserLikedPost,
} from "@/utils/postInteractions";
import type { PostWithInteractions } from "@/utils/postInteractions";

// Shadcn components
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Components
import Comments from "@/components/post/Comments";

// Icons
import {
  X,
  Play,
  Pause,
  Waypoints,
  Heart,
  MessageCircle,
  Send,
} from "lucide-react";

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function PostPage() {
  const router = useRouter();

  const { user } = useAuth();

  const params = useParams();
  const id = params?.id as string | undefined;
  const [post, setPost] = useState<PostWithInteractions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    null
  );

  const [userLiked, setUserLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  const [playing, setPlaying] = useState(true);

  // Fetch post by ID from URL params
  const loadPost = async () => {
    if (!id || typeof id !== "string") return;
    try {
      setLoading(true);
      const postData = await getPostWithInteractions(id);

      if (!postData) {
        setError("Post not found");
      } else {
        setPost(postData);
      }
    } catch (err) {
      setError("Failed to load post");
      console.error("Error loading post:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [id]);

  // Fetch current user's profile
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (post?.user_id) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", post?.user_id)
          .single();

        setCurrentUserProfile(data);
      }
    };

    fetchCurrentUserProfile();
  }, [post?.user_id]);

  const checkIfUserLiked = async () => {
    if (!user || !post) return;
    try {
      const liked = await checkUserLikedPost(post.id, user.id);
      setUserLiked(liked);
    } catch (err) {
      console.error("Error checking like status:", err);
    }
  };

  useEffect(() => {
    if (post && user) {
      checkIfUserLiked();
    }
  }, [post, user]);

  const handleLike = async () => {
    if (!user || !post) return;

    try {
      const result = await toggleLike(post.id, user.id);
      setUserLiked(result.liked);

      // Update post data to reflect new like count
      await loadPost();
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const handlePlayPause = () => {
    // TODO: Implement audio playback logic

    setPlaying(!playing);
  };

  return (
    <div className="w-screen h-screen sm:p-4">
      <div className="w-full h-full p-4 flex flex-col gap-9 rounded-md sm:bg-[#F2F2F2]/75 overflow-hidden">
        {/* header */}
        <div className="flex flex-row justify-between">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              router.push(`/`);
            }}
            className="sm:bg-[#e5e5e5] backdrop-blur-md shadow-inner"
          >
            <X />
          </Button>
          <Button
            variant="ghost"
            onClick={handlePlayPause}
            className="bg-[#e5e5e5] p-0 bg-transparent hover:bg-transparent backdrop-blur-md flex flex-row text-foreground opacity-75 hover:opacity-100 transition-opacity duration-200 ease-in-out"
          >
            {playing ? <Pause /> : <Play />}
            Playing
          </Button>
        </div>

        <Separator />

        {/* content */}
        <div className="w-full overflow-auto">
          <div className="w-full sm:w-1/2 lg:w-1/3 h-full m-auto flex flex-col">
            {/* title */}
            <span className="text-title font-plex-serif">{post?.title}</span>
            {/* author */}
            <div className="mt-3 flex flex-row gap-2 items-center">
              <Avatar
                src={currentUserProfile?.avatar_url ?? undefined}
                alt={currentUserProfile?.name || "user_id"}
              />
              {/* text */}
              <div className="flex flex-col">
                <span className="text-description font-source-sans">
                  {currentUserProfile?.name}
                </span>
                <span className="text-metadata font-source-sans uppercase">
                  {post?.created_at && formatDate(post.created_at)}
                </span>
              </div>
            </div>
            {/* meta tags */}
            <div className="mt-5 flex flex-row flex-wrap gap-2 items-center">
              {post?.types?.map((type, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-background/50 backdrop-blur-md shadow-inner sm:px-5 sm:py-1 text-description font-source-sans"
                >
                  {type}
                </Badge>
              ))}
            </div>
            <Separator className="my-9" />
            {/* Toggle between description and comments */}
            <div></div>
            {showComments ? (
              <Comments postId={post?.id || ""} post={post} />
            ) : (
              <span className="w-full h-auto text-description font-source-sans whitespace-pre-line">
                {post?.description}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* menubar */}
        <Menubar className="w-[296px] m-auto flex justify-between px-2.5 py-4 bg-background/50 backdrop-blur-md shadow-inner">
          <MenubarMenu>
            <Waypoints />
            {/* Like post */}
            <Button
              variant="ghost"
              onClick={handleLike}
              className={`flex items-center gap-2 hover:bg-transparent  ${
                userLiked
                  ? "text-red-500 hover:text-red-500"
                  : "hover:opacity-70"
              }`}
              title="Like"
            >
              <Heart
                className={`!w-6 !h-6  ${userLiked ? "fill-current" : ""}`}
              />
              {(post?.likes?.length ?? 0) > 0 && (
                <span className="text-foreground">
                  {post?.likes?.length ?? 0}
                </span>
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
            <Send />
          </MenubarMenu>
        </Menubar>
      </div>
    </div>
  );
}
