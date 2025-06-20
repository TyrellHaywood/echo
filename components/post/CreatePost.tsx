"use client";

// Dependencies
import React, { useState, useEffect, useRef } from "react";
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
  Pause,
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

  // Audio trimming states
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  // Simple state for button display
  const [buttonText, setButtonText] = useState("Play");
  const [audioSrc, setAudioSrc] = useState<string>("");

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement>(null);

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
    setAudioFile(file);
    setButtonText("Play"); // Reset button
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

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioFile) {
      return;
    }

    // Check if currently playing
    if (!audio.paused) {
      audio.pause();
      setButtonText("Play");
      return;
    }

    // Make sure audio is loaded
    if (!audio.duration || isNaN(audio.duration)) {
      audio.load();

      // Wait for it to load
      const handleCanPlay = () => {
        audio.removeEventListener("canplay", handleCanPlay);
        handlePlay();
      };

      audio.addEventListener("canplay", handleCanPlay);
      return;
    }

    // Get trim settings
    const duration = audio.duration;
    const startTime = (trimStart / 100) * duration;
    const endTime = (trimEnd / 100) * duration;

    // Set position and play
    audio.currentTime = startTime;
    audio.volume = 1.0;
    audio.muted = false;

    // Start playing
    audio
      .play()
      .then(() => {
        setButtonText("Pause");

        // Interval to check position
        const checkPosition = setInterval(() => {
          if (!audio || audio.paused || audio.currentTime >= endTime) {
            clearInterval(checkPosition);
            if (audio && !audio.paused && audio.currentTime >= endTime) {
              audio.pause();
            }
            setButtonText("Play");
          } else {
          }
        }, 500); // Check every 500ms
      })
      .catch((err) => {
        console.error("Play failed:", err);
        setButtonText("Play");
      });
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
        duration: audioRef.current?.duration || null,
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
      setPostData({ title: "", description: "" });
      setTrimStart(0);
      setTrimEnd(100);
      setButtonText("Play");
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
          <div className="space-y-4">
            {audioFile && (
              <div className="space-y-4">
                {/* Static audio element with stable src */}
                <audio
                  ref={audioRef}
                  src={audioSrc}
                  preload="metadata"
                  style={{ display: "none" }}
                  onLoadedMetadata={() => {}}
                  onError={(e) => {
                    console.error("Audio error:", e);
                  }}
                />

                {/* Trimming interface */}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Play/Pause Buttons */}
                    <Button
                      variant="default"
                      size="icon"
                      className=""
                      onClick={handlePlay}
                    >
                      {buttonText === "Pause" ? (
                        <Pause size={16} fill="white" />
                      ) : (
                        <Play size={16} fill="white" />
                      )}
                    </Button>

                    {/* Audio Track with Trim Handles */}
                    <div className="flex-1 relative rounded-md">
                      {/* Yellow track container */}
                      <div className="h-9 bg-transparent rounded-md border border-input relative overflow-hidden">
                        {/* TODO: Audio waveform representation */}

                        {/* Left trim handle */}
                        <div
                          className="absolute top-0 left-0 w-3 h-full bg-black rounded-l-md cursor-ew-resize flex items-center justify-center select-none"
                          style={{ left: `${trimStart}%` }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const target = e.currentTarget as HTMLElement;
                            const container =
                              target.parentElement as HTMLElement;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              if (container) {
                                const rect = container.getBoundingClientRect();
                                const percent = Math.max(
                                  0,
                                  Math.min(
                                    trimEnd - 5,
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
                            document.addEventListener("mouseup", handleMouseUp);
                          }}
                        >
                          <ChevronLeft color="white" />
                        </div>

                        {/* Right trim handle */}
                        <div
                          className="absolute top-0 right-0 w-3 h-full bg-black rounded-r-md cursor-ew-resize flex items-center justify-center select-none"
                          style={{ right: `${100 - trimEnd}%` }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const target = e.currentTarget as HTMLElement;
                            const container =
                              target.parentElement as HTMLElement;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              if (container) {
                                const rect = container.getBoundingClientRect();
                                const percent = Math.max(
                                  trimStart + 5,
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
                            document.addEventListener("mouseup", handleMouseUp);
                          }}
                        >
                          <ChevronRight color="white" />
                        </div>

                        {/* Dimmed areas outside selection */}
                        <div
                          className="absolute top-0 left-0 h-full bg-black/50"
                          style={{ width: `${trimStart}%` }}
                        />
                        <div
                          className="absolute top-0 right-0 h-full bg-black/50"
                          style={{ width: `${100 - trimEnd}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trim info display */}
                  <div className="mt-2 text-metadata text-center">
                    Duration:{" "}
                    {audioRef.current?.duration &&
                      (() => {
                        const duration = audioRef.current.duration;
                        const startTime = (trimStart / 100) * duration;
                        const endTime = (trimEnd / 100) * duration;
                        const trimmedDuration = endTime - startTime;
                        return `${trimmedDuration.toFixed(1)}s`;
                      })()}
                  </div>
                </div>
              </div>
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

  // Set up audio source when file changes
  useEffect(() => {
    if (audioFile) {
      const audioUrl = URL.createObjectURL(audioFile);
      setAudioSrc(audioUrl);

      return () => {
        URL.revokeObjectURL(audioUrl);
      };
    } else {
      setAudioSrc("");
    }
  }, [audioFile]);

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
