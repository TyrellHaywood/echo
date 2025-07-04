"use client";

// Dependencies
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Database } from "@/types/supabase";
import { useRouter } from "next/navigation";

// Utils
import { fetchPostById, formatDate } from "@/utils/dataTransformer";
import { supabase } from "@/utils/supabase";

// Shadcn components
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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

  const params = useParams();
  const id = params?.id as string | undefined;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    null
  );

  const [playing, setPlaying] = useState(true);

  // Fetch post by ID from URL params
  useEffect(() => {
    if (!id || typeof id !== "string") return;
    const loadPost = async () => {
      try {
        setLoading(true);
        const postData = await fetchPostById(id);

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

  const handlePlayPause = () => {
    // TODO: Implement audio playback logic

    setPlaying(!playing);
  };

  return (
    <div className="w-screen h-screen sm:p-4">
      <div className="w-full h-full p-4 flex flex-col gap-9 rounded-md sm:bg-[#F2F2F2]/75">
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
          {/* description */}
          <span className="w-full h-auto text-description font-source-sans whitespace-pre-line">
            {post?.description}
          </span>
        </div>

        <Separator />

        {/* menubar */}
        <Menubar className="w-[296px] m-auto flex justify-between px-2.5 py-4 bg-background/50 backdrop-blur-md shadow-inner">
          <MenubarMenu>
            <Waypoints />
            <Heart />
            <MessageCircle />
            <Send />
          </MenubarMenu>
        </Menubar>
      </div>
    </div>
  );
}
