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
  getPostWithInteractions,
  toggleLike,
  addComment,
  checkUserLikedPost,
  getPostAudioUrl,
} from "@/utils/postInteractions";
import type { PostWithInteractions } from "@/utils/postInteractions";
import { useAudioPlayer, NativeAudioPlayer } from "@/utils/audioService";

// Shadcn components
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [userLiked, setUserLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [showFallbackPlayer, setShowFallbackPlayer] = useState(false);

  const [autoPlayEnabled, setAutoPlayEnabled] = useState(() => {
    // Read from localStorage if available (default to false)
    if (typeof window !== "undefined") {
      return localStorage.getItem("audioAutoPlay") === "true";
    }
    return false;
  });
  const [audioState, audioControls] = useAudioPlayer(audioUrl, {
    autoPlay: autoPlayEnabled,
  });

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
        console.log("Post loaded:", postData);

        // Get the audio URL using our utility function
        const url = await getPostAudioUrl(postData);
        setAudioUrl(url);
        console.log("Audio URL set:", url);
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

  // Check if user has liked the post
  useEffect(() => {
    const checkIfUserLiked = async () => {
      if (!user || !post) return;
      try {
        const liked = await checkUserLikedPost(post.id, user.id);
        setUserLiked(liked);
      } catch (err) {
        console.error("Error checking like status:", err);
      }
    };

    if (post && user) {
      checkIfUserLiked();
    }
  }, [post, user]);

  // Handle like action
  const handleLike = async () => {
    if (!user || !post) return;

    try {
      const result = await toggleLike(post.id, user.id);
      setUserLiked(result.liked);
      await loadPost(); // Refresh post data
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  // Audio controls wrapper functions
  const handlePlayPause = () => {
    if (!audioState.isLoaded) return;

    if (audioState.isPlaying) {
      audioControls.pause();
    } else {
      audioControls.play();
    }
  };

  const handleSeek = (value: number[]) => {
    if (!audioState.isLoaded) return;
    audioControls.seek(value[0]);
  };

  // Toggle fallback player when custom player fails
  const toggleFallbackPlayer = () => {
    setShowFallbackPlayer(!showFallbackPlayer);
  };

  const toggleAutoPlay = () => {
    const newValue = !autoPlayEnabled;
    setAutoPlayEnabled(newValue);

    // Save preference
    if (typeof window !== "undefined") {
      localStorage.setItem("audioAutoPlay", String(newValue));
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen sm:p-4 flex items-center justify-center">
        <div>Loading post...</div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="w-screen h-screen sm:p-4 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen sm:p-4">
      <div className="w-full h-full p-4 pb-[100px] flex flex-col gap-9 rounded-md sm:bg-[#F2F2F2]/75 overflow-hidden">
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
          <div className="flex flex-col gap-2">
            {/* Audio error display and retry options */}
            {audioState.error && (
              <div className="flex flex-col text-red-500 text-xs bg-red-50/80 p-2 rounded-md">
                <p>{audioState.error}</p>
                <div className="flex gap-2 justify-end mt-1">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={audioControls.retry}
                    className="text-xs text-red-700 px-2 py-0 h-6"
                  >
                    Retry
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={toggleFallbackPlayer}
                    className="text-xs text-red-700 px-2 py-0 h-6"
                  >
                    {showFallbackPlayer
                      ? "Hide Fallback"
                      : "Try Fallback Player"}
                  </Button>
                </div>
              </div>
            )}

            {/* Fallback native audio player */}
            {showFallbackPlayer && audioUrl && (
              <div className="my-2">
                <NativeAudioPlayer url={audioUrl} className="w-full" />
              </div>
            )}

            {/* Custom audio player */}
            {!showFallbackPlayer && (
              <>
                <Button
                  variant="ghost"
                  onClick={handlePlayPause}
                  disabled={!audioState.isLoaded || !!audioState.error}
                  className="bg-[#e5e5e5] p-0 bg-transparent hover:bg-transparent backdrop-blur-md flex flex-row items-center gap-2 text-foreground opacity-75 hover:opacity-100 transition-opacity duration-200 ease-in-out"
                >
                  {!post?._url ? (
                    "No audio available"
                  ) : !audioState.isLoaded && !audioState.error ? (
                    "Loading audio..."
                  ) : audioState.isPlaying ? (
                    <>
                      <Pause /> Playing
                    </>
                  ) : (
                    <>
                      <Play /> Paused
                    </>
                  )}
                </Button>

                {/* Audio scrubber */}
                {audioState.isLoaded && !audioState.error && (
                  <div className="flex flex-col gap-1">
                    <Slider
                      value={[audioState.currentTime]}
                      max={audioState.duration || 100}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {audioControls.formatTime(audioState.currentTime)}
                      </span>
                      <span>
                        {audioControls.formatTime(audioState.duration)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
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
            {showComments ? (
              <Comments postId={post?.id || ""} post={post} />
            ) : (
              <span className="w-full h-auto text-description font-source-sans whitespace-pre-line">
                {post?.description}
              </span>
            )}
          </div>
        </div>

        {/* menubar */}
        <div
          className="absolute bottom-4 p-4 left-1/2 transform -translate-x-1/2 border-t-[1px] border-border bg-[#F2F2F2]/50"
          style={{ width: "calc(100vw - 64px)" }}
        >
          <Menubar className="w-1/3 m-auto flex justify-between px-2.5 py-4 bg-transparent border-none shadow-none">
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
              <Button
                variant="ghost"
                className="hover:bg-transparent"
                onClick={() => {
                  // generate current url and copy it to clipboard
                  const postUrl = `${window.location.origin}/post/${post?.id}`;
                  navigator.clipboard.writeText(postUrl);
                  toast.success("Post URL copied to clipboard!");
                }}
              >
                <Send />
              </Button>
            </MenubarMenu>
          </Menubar>
        </div>
      </div>
    </div>
  );
}
