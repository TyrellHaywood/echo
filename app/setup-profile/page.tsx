"use client";

// Dependencies
import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { setupProfile } from "./setup";
import Image from "next/image";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Icons
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

// Types
interface ProfileData {
  username: string;
  name: string;
  pronouns: string;
  bio: string;
  interests: string[];
}

export default function SetupProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentInterest, setCurrentInterest] = useState("");
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // Temporary profile data
  const [profileData, setProfileData] = useState<ProfileData>({
    username: "",
    name: "",
    pronouns: "",
    bio: "",
    interests: [],
  });

  const currentSetup = setupProfile[currentStep];

  const handleNext = () => {
    if (currentStep < setupProfile.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError("");

    try {
      // Store the file locally for preview
      setAvatarFile(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      console.log("Avatar preview created successfully");
    } catch (error: any) {
      setError(error.message);
    }
  };

  const addInterest = () => {
    if (
      currentInterest.trim() &&
      !profileData.interests.includes(currentInterest.trim())
    ) {
      setProfileData((prev) => ({
        ...prev,
        interests: [...prev.interests, currentInterest.trim()],
      }));
      setCurrentInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setProfileData((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }));
  };

  const handleSubmitProfile = async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      let avatarUrl = "";

      // Upload avatar if one was selected
      if (avatarFile) {
        setUploading(true);
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatar")
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatar").getPublicUrl(fileName);

        avatarUrl = publicUrl;
        setUploading(false);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: profileData.username,
          name: profileData.name,
          avatar_url: avatarUrl,
          pronouns: profileData.pronouns,
          bio: profileData.bio,
          interests: profileData.interests,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      router.push("/");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const renderInput = () => {
    switch (currentStep) {
      case 0: // Setup Profile - Skip input
        return null;

      case 1: // Profile Picture
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              {avatarPreview && (
                <div className="flex flex-col items-center gap-2">
                  <Image
                    src={avatarPreview}
                    alt="Avatar preview"
                    width={64}
                    height={64}
                    className="rounded-md object-cover w-full max-w-64 max-h-64"
                  />
                  <span className="flex flex-row items-center gap-1 text-status text-green-600">
                    <Check size={16} /> Selected
                  </span>
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="file:rounded-sm file:bg-muted hover:file:bg-muted/70"
              />
            </div>
          </div>
        );

      case 2: // Create Username
        return (
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Username"
              value={profileData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
            />
            <Input
              type="text"
              placeholder="Name"
              value={profileData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
          </div>
        );

      case 3: // Add Pronouns
        return (
          <div>
            <Input
              type="text"
              placeholder="Your pronouns"
              value={profileData.pronouns}
              onChange={(e) => handleInputChange("pronouns", e.target.value)}
            />
          </div>
        );

      case 4: // Add Bio
        return (
          <div>
            <Textarea
              placeholder="Tell us about yourself"
              value={profileData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
            />
          </div>
        );

      case 5: // Interests
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Add interest"
                value={currentInterest}
                onChange={(e) => setCurrentInterest(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInterest()}
              />
              <Button type="button" onClick={addInterest}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profileData.interests.map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="flex flex-row gap-2"
                >
                  {interest}
                  <Button
                    onClick={() => removeInterest(interest)}
                    size="icon"
                    variant="ghost"
                    className="p-0 w-auto h-auto"
                  >
                    x
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        );

      case 6: // Preview
        return (
          <div className="space-y-4">
            <div>
              <span>Username:</span> {profileData.username}
            </div>
            <div>
              <span>Name:</span> {profileData.name}
            </div>
            <div>
              <span>Pronouns:</span> {profileData.pronouns}
            </div>
            <div>
              <span>Bio:</span> {profileData.bio}
            </div>{" "}
            <div>
              <span>Profile Picture:</span>
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar preview"
                  width={64}
                  height={64}
                  className="rounded-md object-cover w-full max-w-64 max-h-64"
                />
              ) : (
                <div className="text-red-500 mt-2">
                  No profile image selected
                </div>
              )}
            </div>
            <div>
              <span>Interests:</span>
              <div className="flex flex-wrap gap-2">
                {profileData.interests.map((interest) => (
                  <Badge key={interest} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
            {error && <div className="text-red-500">{error}</div>}
          </div>
        );

      default:
        return null;
    }
  };

  // Cleanup avatar preview URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-16">
      {/* Header */}
      <header className="text-center flex flex-col gap-2">
        <h1 className="text-header font-plex-serif">{currentSetup.header}</h1>
        <h2 className="text-sub-header font-source-sans">
          {currentSetup.subHeader}
        </h2>
      </header>

      {/* Input */}
      {currentStep !== 0 && (
        <div className="w-full max-w-[320px]">{renderInput()}</div>
      )}

      <div className="w-full flex justify-end md:justify-center">
        {currentStep === setupProfile.length - 1 ? (
          <Button onClick={handleSubmitProfile} disabled={loading || uploading}>
            {loading || uploading ? "Saving..." : "Complete Setup"}
          </Button>
        ) : (
          <div
            className={`m-auto flex w-full max-w-[320px] ${
              currentStep === 0 ? "justify-center" : "justify-between"
            }`}
          >
            {currentStep > 0 && (
              <Button
                variant="secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                <ArrowLeft />
                Previous
              </Button>
            )}
            <Button variant="secondary" onClick={handleNext}>
              {currentStep === 0 ? "Get started" : <ArrowRight />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
