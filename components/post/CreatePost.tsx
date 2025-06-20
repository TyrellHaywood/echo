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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// Icons
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Types
interface PostData {
  title: string;
  description: string;
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

  // Audio trimming states (for future implementation)
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  // Post data
  const [postData, setPostData] = useState<PostData>({
    title: "",
    description: "",
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

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError("");

    try {
      setAudioFile(file);
      console.log("Audio file selected:", file.name);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError("");

    try {
      setCoverFile(file);
      const previewUrl = URL.createObjectURL(file);
      setCoverPreview(previewUrl);
      console.log("Cover image selected:", file.name);
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
        _url: audioUrl,
        cover_image_url: coverUrl || null,
        duration: null, // You can calculate this from the audio file if needed
        is_remix: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: postError } = await supabase.from("posts").insert(newPost);

      if (postError) throw postError;

      console.log("Post created successfully!");

      // Reset form and close dialog
      setCurrentStep(0);
      setAudioFile(null);
      setCoverFile(null);
      setCoverPreview("");
      setPostData({ title: "", description: "" });
      setOpen(false);

      // Optionally refresh the page or redirect
      // router.refresh();
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
          <div className="space-y-4">
            {audioFile && (
              <>
                {/* Audio Player */}
                <audio
                  ref={(audio) => {
                    if (audio) {
                      audio.src = URL.createObjectURL(audioFile);
                    }
                  }}
                  className="w-full"
                  controls
                />

                {/* Trimming Interface */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-center">
                    Trim Audio
                  </div>

                  {/* Trim Bar Container - styled like shadcn input */}
                  <div className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm">
                    <div className="flex-1 flex items-center">
                      {/* Audio Waveform Placeholder */}
                      <div className="w-full h-4 bg-gradient-to-r from-blue-200 to-blue-400 rounded-sm relative overflow-hidden">
                        {/* Visual representation of audio */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-2 bg-blue-500 opacity-50 rounded-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trim Controls Container - styled like shadcn input */}
                  <div className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm">
                    <div className="flex-1 flex items-center">
                      {/* Trim Controls */}
                      <div className="relative w-full">
                        {/* Background track */}
                        <div className="w-full h-1 bg-muted-foreground/20 rounded-full relative">
                          {/* Selected range */}
                          <div
                            className="absolute h-1 bg-primary rounded-full"
                            style={{
                              left: `${trimStart}%`,
                              width: `${trimEnd - trimStart}%`,
                            }}
                          />

                          {/* Start handle */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-4 bg-primary rounded cursor-grab active:cursor-grabbing flex items-center justify-center"
                            style={{
                              left: `${trimStart}%`,
                              marginLeft: "-6px",
                            }}
                            onMouseDown={(e) => {
                              const handleMouseMove = (
                                moveEvent: MouseEvent
                              ) => {
                                const target = e.currentTarget as HTMLElement;
                                const container =
                                  target.parentElement as HTMLElement;
                                if (container) {
                                  const rect =
                                    container.getBoundingClientRect();
                                  const percent = Math.max(
                                    0,
                                    Math.min(
                                      trimEnd - 1,
                                      ((moveEvent.clientX - rect.left) /
                                        rect.width) *
                                        100
                                    )
                                  );
                                  setTrimStart(percent);
                                }
                              };

                              const handleMouseUp = () => {
                                document.removeEventListener(
                                  "mousemove",
                                  handleMouseMove
                                );
                                document.removeEventListener(
                                  "mouseup",
                                  handleMouseUp
                                );
                              };

                              document.addEventListener(
                                "mousemove",
                                handleMouseMove
                              );
                              document.addEventListener(
                                "mouseup",
                                handleMouseUp
                              );
                            }}
                          >
                            <ChevronLeft
                              size={8}
                              className="text-primary-foreground"
                            />
                          </div>

                          {/* End handle */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-4 bg-primary rounded cursor-grab active:cursor-grabbing flex items-center justify-center"
                            style={{ left: `${trimEnd}%`, marginLeft: "-6px" }}
                            onMouseDown={(e) => {
                              const handleMouseMove = (
                                moveEvent: MouseEvent
                              ) => {
                                const target = e.currentTarget as HTMLElement;
                                const container =
                                  target.parentElement as HTMLElement;
                                if (container) {
                                  const rect =
                                    container.getBoundingClientRect();
                                  const percent = Math.max(
                                    trimStart + 1,
                                    Math.min(
                                      100,
                                      ((moveEvent.clientX - rect.left) /
                                        rect.width) *
                                        100
                                    )
                                  );
                                  setTrimEnd(percent);
                                }
                              };

                              const handleMouseUp = () => {
                                document.removeEventListener(
                                  "mousemove",
                                  handleMouseMove
                                );
                                document.removeEventListener(
                                  "mouseup",
                                  handleMouseUp
                                );
                              };

                              document.addEventListener(
                                "mousemove",
                                handleMouseMove
                              );
                              document.addEventListener(
                                "mouseup",
                                handleMouseUp
                              );
                            }}
                          >
                            <ChevronRight
                              size={8}
                              className="text-primary-foreground"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time Display */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(trimStart)}%</span>
                    <span>{Math.round(trimEnd)}%</span>
                  </div>

                  {/* Play Trimmed Section Button */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Basic implementation - you can enhance this with Web Audio API
                        const audio = document.querySelector(
                          "audio"
                        ) as HTMLAudioElement;
                        if (audio && audio.duration) {
                          const startTime = (trimStart / 100) * audio.duration;
                          const endTime = (trimEnd / 100) * audio.duration;
                          audio.currentTime = startTime;
                          audio.play();

                          // Stop at end time
                          const stopTimer = setTimeout(() => {
                            audio.pause();
                          }, (endTime - startTime) * 1000);

                          audio.addEventListener(
                            "pause",
                            () => clearTimeout(stopTimer),
                            { once: true }
                          );
                        }
                      }}
                    >
                      <Play size={16} className="mr-2" />
                      Play Trimmed
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
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

      case 4: // Preview with Description
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

            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
        );

      default:
        return null;
    }
  };

  // Cleanup preview URL on unmount
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
