"use client";

// Dependencies
import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/utils/supabase";

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
      } else {
        setProfile(data);
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
          .eq("id", user.id) // Fixed: changed from user_id to id
          .single();

        setCurrentUserProfile(data);
      }
    };

    fetchCurrentUserProfile();
  }, [user]);

  // Useful for implementing user privacy features & permissions
  const isOwnProfile = currentUserProfile?.username === username;

  return (
    <div>
      <h1>{user?.id}</h1>
    </div>
  );
}
