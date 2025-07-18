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

  return (
    <>
      <Toolbar />

      {/* Edit/Save/Cancel buttons - only show for own profile */}
      {isOwnProfile && (
        <div className="absolute top-6 right-6 flex gap-2">
          {!isEditing ? (
            <Button
              variant="outline"
              className="flex flex-row gap-1 bg-background/50 backdrop-blur-md shadow-inner"
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
                className="flex flex-row gap-1 bg-background/50 backdrop-blur-md shadow-inner"
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
            <span className="">No avatar</span>
          </div>
        )}

        {/* Username */}
        {isEditing ? (
          <Input
            value={editedProfile?.username || ""}
            onChange={(e) => handleInputChange("username", e.target.value)}
            className="text-sub-title font-plex-serif text-left w-full max-w-80 mb-2"
            placeholder="Username"
          />
        ) : (
          <h1 className="text-sub-title font-plex-serif text-left w-full max-w-80 pl-4">
            {profile?.username}
          </h1>
        )}

        {/* Name & pronouns */}
        {isEditing ? (
          <div className="flex flex-col gap-2 w-full max-w-80 mb-2">
            <Input
              value={editedProfile?.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="text-sub-description font-source-sans"
              placeholder="Display Name"
            />
            <Input
              value={editedProfile?.pronouns || ""}
              onChange={(e) => handleInputChange("pronouns", e.target.value)}
              className="text-sub-description font-source-sans"
              placeholder="Pronouns"
            />
          </div>
        ) : (
          <div className="flex flex-row gap-2 w-full max-w-80 pl-4 mb-1">
            <span className="text-sub-description font-source-sans">
              {profile?.name || "Name"}
            </span>
            •
            <span className="text-sub-description font-source-sans">
              {profile?.pronouns || "Pronouns"}
            </span>
          </div>
        )}

        {/* Bio */}
        {isEditing ? (
          <Textarea
            value={editedProfile?.bio || ""}
            onChange={(e) => handleInputChange("bio", e.target.value)}
            className="font-source-sans w-full max-w-80 mb-2 min-h-[100px]"
            placeholder="Tell us about yourself..."
          />
        ) : (
          <p className="text-description font-source-sans w-full max-w-80 pl-4">
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
                value={currentInterest}
                onChange={(e) => setCurrentInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInterest();
                  }
                }}
              />
              <Button type="button" onClick={addInterest} size="sm">
                Add
              </Button>
            </div>
          )}

          <div className="flex flex-row flex-wrap gap-2 pl-4">
            {(isEditing ? editedProfile?.interests : profile?.interests)?.map(
              (interest, index) => (
                <Badge
                  key={index}
                  className="bg-background/50 backdrop-blur-md shadow-inner"
                  variant={"outline"}
                >
                  {interest}
                  {isEditing && (
                    <Button
                      onClick={() => removeInterest(interest)}
                      size="icon"
                      variant="ghost"
                      className="ml-1 py-0 px-1 w-auto h-auto hover:bg-transparent text-muted-foreground hover:text-foreground"
                    >
                      <X className="" />
                    </Button>
                  )}
                </Badge>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
