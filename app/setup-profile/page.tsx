"use client";

// Dependencies
import React, { useState } from "react";
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
import { ArrowRight, ArrowLeft, Upload } from "lucide-react";

// Types
interface ProfileData {
  username: string;
  name: string;
  avatar_url: string;
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

  // Temporary profile data
  const [profileData, setProfileData] = useState<ProfileData>({
    username: "",
    name: "",
    avatar_url: "",
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

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatar")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatar").getPublicUrl(fileName);

      setProfileData((prev) => ({
        ...prev,
        avatar_url: publicUrl,
      }));
      setAvatarFile(file);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUploading(false);
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
      const { error } = await supabase
        .from("profiles")
        .update({
          username: profileData.username,
          name: profileData.name,
          avatar_url: profileData.avatar_url,
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
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              )}
              {profileData.avatar_url && (
                <div className="flex items-center gap-2">
                  <img
                    src={profileData.avatar_url}
                    alt="Avatar preview"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <span className="text-sm text-green-600">✓ Uploaded</span>
                </div>
              )}
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
                    ×
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        );

      case 6: // Preview
        return (
          <div className="space-y-4">
            <Image
              src={profileData.avatar_url}
              alt="Profile Picture Preview"
              width={400}
              height={400}
              className=""
            />
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
            </div>
            {profileData.avatar_url && (
              <div>
                <span>Profile Picture:</span>
                <img
                  src={profileData.avatar_url}
                  alt="Avatar preview"
                  className="w-16 h-16 rounded-full object-cover mt-2"
                />
              </div>
            )}
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
          <Button onClick={handleSubmitProfile} disabled={loading}>
            {loading ? "Saving..." : "Complete Setup"}
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
