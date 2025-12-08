"use client";

// Dependencies
import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/utils/supabase";
import Image from "next/image";

// Shadcn components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Icons
import { Pencil, X, Check, XCircle } from "lucide-react";

// Custom components
import Toolbar from "@/components/Toolbar";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import { getBadgeColor, hexToRgba } from "@/utils/badgeColors";


interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export interface Profile {
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
  const { username } = use(params);

  // User data
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editedProfile, setEditedProfile] = useState<Profile | null>(null);
  const [currentInterest, setCurrentInterest] = useState("");

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
        setEditedProfile(data); // Initialize edited profile
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

  // Check if profile has been edited
  const hasChanges = () => {
    if (!profile || !editedProfile) return false;

    return (
      profile.username !== editedProfile.username ||
      profile.name !== editedProfile.name ||
      profile.pronouns !== editedProfile.pronouns ||
      profile.bio !== editedProfile.bio ||
      JSON.stringify(profile.interests) !==
        JSON.stringify(editedProfile.interests)
    );
  };

  // Handle input changes
  const handleInputChange = (field: keyof Profile, value: string) => {
    if (editedProfile) {
      setEditedProfile({
        ...editedProfile,
        [field]: value,
      });
    }
  };

  // Handle interests
  const addInterest = () => {
    if (
      currentInterest.trim() &&
      editedProfile &&
      !editedProfile.interests?.includes(currentInterest.trim())
    ) {
      setEditedProfile({
        ...editedProfile,
        interests: [...(editedProfile.interests || []), currentInterest.trim()],
      });
      setCurrentInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    if (editedProfile) {
      setEditedProfile({
        ...editedProfile,
        interests: (editedProfile.interests || []).filter(
          (i) => i !== interest
        ),
      });
    }
  };

  // Save changes to Supabase
  const saveChanges = async () => {
    if (!editedProfile || !profile?.id) return;

    setIsSaving(true);

    const { data, error } = await supabase
      .from("profiles")
      .update({
        username: editedProfile.username,
        name: editedProfile.name,
        pronouns: editedProfile.pronouns,
        bio: editedProfile.bio,
        interests: editedProfile.interests,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } else {
      setProfile(data);
      setEditedProfile(data);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    }

    setIsSaving(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditedProfile(profile);
    setCurrentInterest("");
    setIsEditing(false);
  };

  // Start editing
  const startEdit = () => {
    setIsEditing(true);
    setEditedProfile(profile);
  };

  // Useful for implementing user privacy features & permissions
  const isOwnProfile = currentUserProfile?.username === username;

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="relative w-full min-h-screen bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat">
      <Toolbar />

      {/* Edit/Save/Cancel buttons - only show for own profile */}
      {isOwnProfile && (
        <div className="absolute top-6 right-6 flex gap-2">
          {!isEditing ? (
            <Button
              variant="outline"
              className="flex flex-row gap-1 bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white hover:bg-white/15 hover:border-white/30"
              onClick={startEdit}
            >
              Edit
            </Button>
          ) : (
            <>
              <Button
                className="flex flex-row gap-1"
                disabled={!hasChanges() || isSaving}
                onClick={saveChanges}
              >
                {isSaving ? <LoadingSpinner /> : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                className="flex flex-row gap-1 bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white hover:bg-white/15 hover:border-white/30"
                onClick={cancelEdit}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col items-center justify-center w-4/5 h-screen m-auto">
        {profile?.avatar_url ? (
          <div className="relative w-full max-w-80 aspect-square mb-3">
            <Image
              src={profile.avatar_url}
              alt="Avatar preview"
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="rounded-md object-cover shadow-xl"
            />
          </div>
        ) : (
          <div className="">
            <span className="text-white/60">No avatar</span>
          </div>
        )}

        {/* Username */}
        {isEditing ? (
          <Input
            value={editedProfile?.username || ""}
            onChange={(e) => handleInputChange("username", e.target.value)}
            className="text-sub-title font-plex-serif text-left w-full max-w-80 mb-2 bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
            placeholder="Username"
          />
        ) : (
          <h1 className="text-sub-title font-plex-serif text-left w-full max-w-80 pl-4 text-white">            {profile?.username}
          </h1>
        )}

        {/* Name & pronouns */}
        {isEditing ? (
          <div className="flex flex-col gap-2 w-full max-w-80 mb-2">
            <Input
              value={editedProfile?.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="text-sub-description font-source-sans bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
              placeholder="Display Name"
            />
            <Input
              value={editedProfile?.pronouns || ""}
              onChange={(e) => handleInputChange("pronouns", e.target.value)}
              className="text-sub-description font-source-sans bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
              placeholder="Pronouns"
            />
          </div>
        ) : (
          <div className="flex flex-row gap-2 w-full max-w-80 pl-4 mb-1 text-white/80">
            <span className="text-sub-description font-source-sans text-white/80">
              {profile?.name || "Name"}
            </span>
            •
            <span className="text-sub-description font-source-sans text-white/80">
              {profile?.pronouns || "Pronouns"}
            </span>
          </div>
        )}

        {/* Bio */}
        {isEditing ? (
          <Textarea
            value={editedProfile?.bio || ""}
            onChange={(e) => handleInputChange("bio", e.target.value)}
            className="font-source-sans w-full max-w-80 mb-2 min-h-[100px] bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
            placeholder="Tell us about yourself..."
          />
        ) : (
          <p className="text-description font-source-sans w-full max-w-80 pl-4 text-white/80">
            {profile?.bio || "No bio yet"}
          </p>
        )}

        {/* Interests */}
        <div className="w-full max-w-80 mt-2">
          {isEditing && (
            <div className="flex gap-2 mb-2">
              <Input
                type="text"
                placeholder="Add interest"
                className="bg-white/10 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
                value={currentInterest}
                onChange={(e) => setCurrentInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInterest();
                  }
                }}
              />
              <Button type="button" onClick={addInterest} size="sm" className="bg-white/20 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(255,255,255,0.1)] border border-white/30 text-white hover:bg-white/25 hover:border-white/40">
                Add
              </Button>
            </div>
          )}

          <div className="flex flex-row flex-wrap gap-2 pl-4">
          {(isEditing ? editedProfile?.interests : profile?.interests)?.map(
            (interest, index) => {
              const bgColor = getBadgeColor(interest);
              return (
                <Badge
                  key={index}
                  className="backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] text-white"
                  variant={"outline"}
                  style={{
                    backgroundColor: hexToRgba(bgColor, 0.15),
                    borderColor: hexToRgba(bgColor, 0.3),
                  }}
                >
                  {interest}
                  {isEditing && (
                    <Button
                      onClick={() => removeInterest(interest)}
                      size="icon"
                      variant="ghost"
                      className="ml-1 py-0 px-1 w-auto h-auto hover:bg-transparent text-white/60 hover:text-white"
                    >
                      <X className="" />
                    </Button>
                  )}
                </Badge>
              );
            }
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
