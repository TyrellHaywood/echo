"use client";

// Dependencies
import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/utils/supabase";
import Image from "next/image";

// Shadcn components
import { Badge } from "@/components/ui/badge";

// Custom components
import Toolbar from "@/components/Toolbar";

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

interface Profile {
  id: string | null;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  pronouns: string | null;
  bio: string | null;
  interests: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  finished_setup: boolean | null;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  // Unwrap params using React.use()
  const { username } = use(params);

  // User data
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Fetch the profile being viewed (from URL)
  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);
      } else {
        setProfile(data);
        console.log("Profile data:", data);
        console.log("Avatar URL:", data?.avatar_url);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [username]);

  // Fetch current user's profile
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setCurrentUserProfile(data);
      }
    };

    fetchCurrentUserProfile();
  }, [user]);

  // Useful for implementing user privacy features & permissions
  const isOwnProfile = currentUserProfile?.username === username;

  return (
    <>
      <Toolbar />

      <div className="flex flex-col items-center justify-center w-4/5 h-screen m-auto">
        {profile?.avatar_url ? (
          <div className="relative w-full max-w-80 aspect-square mb-3">
            <Image
              src={profile.avatar_url}
              alt="Avatar preview"
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="rounded-md object-cover"
              onError={(e) => {}}
              onLoad={() => {}}
            />
          </div>
        ) : (
          <div className="">
            <span className="">No avatar</span>
          </div>
        )}
        {/* Username */}
        <h1 className="text-sub-title font-plex-serif text-left w-full max-w-80 pl-4">
          {profile?.username}
        </h1>
        {/* Name & pronouns */}
        <div className="flex flex-row gap-2 w-full max-w-80 pl-4 mb-1">
          <span className="text-sub-description font-source-sans">
            {profile?.name}
          </span>
          •
          <span className="text-sub-description font-source-sans">
            {profile?.pronouns}
          </span>
        </div>
        {/* Bio */}
        <p className="text-description font-source-sans w-full max-w-80 pl-4">
          {profile?.bio}
        </p>
        {/* Interests */}
        <div className="flex flex-row gap-2 w-full max-w-80 pl-4 mt-2">
          {profile?.interests?.map((interest, index) => (
            <Badge key={index} className="" variant={"outline"}>
              {interest}
            </Badge>
          ))}
        </div>
      </div>
    </>
  );
}
