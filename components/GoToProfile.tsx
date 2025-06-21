"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export const useGoToProfile = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<{
    username: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (error) {
          setUserProfile(null);
        } else {
          setUserProfile(data);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const goToMyProfile = () => {
    if (userProfile?.username) {
      router.push(`/${userProfile.username}`);
    } else {
      // Redirect to profile setup if no username exists
      router.push("/setup-profile");
    }
  };

  return { goToMyProfile, userProfile };
};
