"use client";

// Dependencies
import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { createPost } from "./post";
import Image from "next/image";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// Custom Components
import Adjustments from "./Adjustments";

// Icons
import { ArrowRight, ArrowLeft, Check, Plus } from "lucide-react";

// Types
interface PostData {
  title: string;
  description: string;
  types: string[];
}

export default function CreatePost() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  // File states
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");

  // Audio trimming states
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  // Types input state
  const [currentType, setCurrentType] = useState("");

  // Post data
  const [postData, setPostData] = useState<PostData>({
    title: "",
    description: "",
    types: [],
  });

  const currentSetup = createPost[currentStep];

  const handleNext = () => {
    if (currentStep < createPost.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleInputChange = (field: keyof PostData, value: string) => {
    setPostData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addType = () => {
    if (currentType.trim() && !postData.types.includes(currentType.trim())) {
      setPostData((prev) => ({
        ...prev,
        types: [...prev.types, currentType.trim()],
      }));
      setCurrentType("");
    }
  };

  const removeType = (typeToRemove: string) => {
    setPostData((prev) => ({
      ...prev,
      types: prev.types.filter((type) => type !== typeToRemove),
    }));
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError("");
    setAudioFile(file);
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError("");

    try {
      setCoverFile(file);
      const previewUrl = URL.createObjectURL(file);
      setCoverPreview(previewUrl);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleSubmitPost = async () => {
    if (!user || !audioFile) {
      setError("Audio file is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let audioUrl = "";
      let coverUrl = "";

      setUploading(true);

      // Upload audio file
      const audioExt = audioFile.name.split(".").pop();
      const audioFileName = `${user.id}/${Date.now()}_audio.${audioExt}`;

      const { error: audioUploadError } = await supabase.storage
        .from("audio")
        .upload(audioFileName, audioFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (audioUploadError) throw audioUploadError;

      const {
        data: { publicUrl: audioPublicUrl },
      } = supabase.storage.from("audio").getPublicUrl(audioFileName);

      audioUrl = audioPublicUrl;

      // Upload cover image if provided
      if (coverFile) {
        const coverExt = coverFile.name.split(".").pop();
        const coverFileName = `${user.id}/${Date.now()}_cover.${coverExt}`;

        const { error: coverUploadError } = await supabase.storage
          .from("covers")
          .upload(coverFileName, coverFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (coverUploadError) throw coverUploadError;

        const {
          data: { publicUrl: coverPublicUrl },
        } = supabase.storage.from("covers").getPublicUrl(coverFileName);

        coverUrl = coverPublicUrl;
      }

      setUploading(false);

      // Create post in database
      const newPost = {
        user_id: user.id,
        title: postData.title,
        description: postData.description || null,
        types: postData.types,
        _url: audioUrl,
        cover_image_url: coverUrl || null,
        duration: null,
        is_remix: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: postError } = await supabase.from("posts").insert(newPost);

      if (postError) throw postError;

      // Reset form and close dialog
      setCurrentStep(0);
      setAudioFile(null);
      setCoverFile(null);
      setCoverPreview("");
      setPostData({ title: "", description: "", types: [] });
      setTrimStart(0);
      setTrimEnd(100);
      setCurrentType("");
      setOpen(false);
    } catch (error: any) {
      console.error("Post creation error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const renderInput = () => {
    switch (currentStep) {
      case 0: // Audio Upload
        return (
          <div className="space-y-4">
            {audioFile && (
              <div className="flex flex-col items-center gap-2">
                <span className="flex flex-row items-center gap-1 text-green-600">
                  <Check size={16} /> {audioFile.name}
                </span>
              </div>
            )}
            <Input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="file:rounded-sm file:bg-muted hover:file:bg-muted/70"
            />
          </div>
        );

      case 1: // Adjustments (Audio Trimming)
        return (
          <Adjustments
            audioFile={audioFile}
            trimStart={trimStart}
            trimEnd={trimEnd}
            setTrimStart={setTrimStart}
            setTrimEnd={setTrimEnd}
          />
        );

      case 2: // Cover Image
        return (
          <div className="space-y-4">
            {coverPreview && (
              <div className="flex flex-col items-center gap-2">
                <Image
                  src={coverPreview}
                  alt="Cover preview"
                  width={200}
                  height={200}
                  className="rounded-md object-cover w-full max-w-64 max-h-64"
                />
                <span className="flex flex-row items-center gap-1 text-green-600">
                  <Check size={16} /> Selected
                </span>
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="file:rounded-sm file:bg-muted hover:file:bg-muted/70"
            />
          </div>
        );

      case 3: // Title
        return (
          <div>
            <Input
              type="text"
              placeholder="Enter post title"
              value={postData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
            />
          </div>
        );

      case 4: // Preview with Description and Types
        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              {coverPreview ? (
                <Image
                  src={coverPreview}
                  alt="Cover preview"
                  width={200}
                  height={200}
                  className="rounded-md object-cover w-full max-w-64 max-h-64"
                />
              ) : (
                <div className="w-64 h-64 bg-muted rounded-md flex items-center justify-center">
                  <span className="text-muted-foreground">No cover image</span>
                </div>
              )}
            </div>

            <div className="text-lg font-semibold">
              {postData.title || "Untitled Post"}
            </div>

            {audioFile && (
              <div className="text-sm text-muted-foreground">
                Audio: {audioFile.name}
              </div>
            )}

            <Textarea
              placeholder="Add a description (optional)"
              value={postData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
            />

            {/* Types multi-select */}
            <div className="space-y-2 text-left">
              <div className="text-sm font-medium">Type</div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="What type of audio is this?"
                  value={currentType}
                  onChange={(e) => setCurrentType(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addType()}
                />
                <Button type="button" onClick={addType}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {postData.types.map((type) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className="flex flex-row gap-1"
                  >
                    {type}
                    <Button
                      onClick={() => removeType(type)}
                      size="icon"
                      variant="ghost"
                      className="py-0 px-1 w-auto h-auto hover:bg-transparent text-muted-foreground hover:text-foreground"
                    >
                      x
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
        );

      default:
        return null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="hover:border hover:border-input">
          <Plus />
        </Button>
      </DialogTrigger>
      <VisuallyHidden>
        <DialogTitle>Create new post</DialogTitle>
      </VisuallyHidden>

      <DialogContent className="h-screen flex flex-col items-center justify-center gap-16">
        <header className="text-center flex flex-col gap-2">
          <h1 className="text-header font-plex-serif">{currentSetup.header}</h1>
          <h2 className="text-sub-header font-source-sans">
            {currentSetup.subHeader}
          </h2>
        </header>

        <div className="w-full max-w-[320px]">{renderInput()}</div>

        <div className="w-full flex justify-end md:justify-center">
          {currentStep === createPost.length - 1 ? (
            <Button
              onClick={handleSubmitPost}
              disabled={loading || uploading || !audioFile || !postData.title}
            >
              {loading || uploading ? "Creating..." : "Create Post"}
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
              <Button
                variant="secondary"
                onClick={handleNext}
                disabled={currentStep === 0 && !audioFile}
              >
                {currentStep === 0 ? "Next" : <ArrowRight />}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
