"use client";

// Dependencies
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
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
import { ArrowRight, ArrowLeft, Check, Waypoints } from "lucide-react";

// Types
interface PostData {
  title: string;
  description: string;
  types: string[];
}

interface Post {
  id: string;
  title: string;
  _url: string;
  cover_image_url?: string;
  user_id?: string;
  children_ids?: string[];
}

interface EchoDialogProps {
  parentPost: Post;
  onSuccess?: () => void;
}

export default function EchoDialog({ parentPost, onSuccess }: EchoDialogProps) {
  const { user } = useAuth();
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
    title: `Echo: ${parentPost.title}`,
    description: "",
    types: [],
  });

  // Audio mixing refs and states
  const audioContextRef = useRef<AudioContext | null>(null);
  const [mixedAudioBlob, setMixedAudioBlob] = useState<Blob | null>(null);

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

  // Audio mixing function
  const mixAudioFiles = async (
    parentAudioUrl: string,
    newAudioFile: File
  ): Promise<Blob> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    try {
      // Fetch parent audio
      const parentResponse = await fetch(parentAudioUrl);
      const parentArrayBuffer = await parentResponse.arrayBuffer();
      const parentAudioBuffer = await audioContext.decodeAudioData(
        parentArrayBuffer
      );

      // Load new audio file
      const newAudioArrayBuffer = await newAudioFile.arrayBuffer();
      const newAudioBuffer = await audioContext.decodeAudioData(
        newAudioArrayBuffer
      );

      // Determine the length of the mixed audio (use the longer one)
      const maxLength = Math.max(
        parentAudioBuffer.length,
        newAudioBuffer.length
      );
      const sampleRate = audioContext.sampleRate;

      // Create a new buffer for the mixed audio
      const mixedBuffer = audioContext.createBuffer(
        Math.max(
          parentAudioBuffer.numberOfChannels,
          newAudioBuffer.numberOfChannels
        ),
        maxLength,
        sampleRate
      );

      // Mix the audio
      for (let channel = 0; channel < mixedBuffer.numberOfChannels; channel++) {
        const mixedData = mixedBuffer.getChannelData(channel);

        // Get parent audio data (or silence if not enough channels)
        const parentData =
          channel < parentAudioBuffer.numberOfChannels
            ? parentAudioBuffer.getChannelData(channel)
            : new Float32Array(parentAudioBuffer.length);

        // Get new audio data (or silence if not enough channels)
        const newData =
          channel < newAudioBuffer.numberOfChannels
            ? newAudioBuffer.getChannelData(channel)
            : new Float32Array(newAudioBuffer.length);

        // Mix the audio (simple addition with volume control)
        for (let i = 0; i < maxLength; i++) {
          const parentSample = i < parentData.length ? parentData[i] * 0.5 : 0; // Reduce volume
          const newSample = i < newData.length ? newData[i] * 0.5 : 0; // Reduce volume
          mixedData[i] = parentSample + newSample;

          // Prevent clipping
          if (mixedData[i] > 1) mixedData[i] = 1;
          if (mixedData[i] < -1) mixedData[i] = -1;
        }
      }

      // Convert buffer to WAV blob
      const wavBlob = await bufferToWav(mixedBuffer);
      return wavBlob;
    } catch (error) {
      console.error("Error mixing audio:", error);
      throw new Error("Failed to mix audio files");
    }
  };

  // Helper function to convert AudioBuffer to WAV Blob
  const bufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const handleSubmitPost = async () => {
    if (!user || !audioFile) {
      setError("Audio file is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      setUploading(true);

      // Mix the parent audio with the new audio
      const mixedBlob = await mixAudioFiles(parentPost._url, audioFile);
      setMixedAudioBlob(mixedBlob);

      // Upload mixed audio file
      const audioFileName = `${user.id}/${Date.now()}_remix_audio.wav`;

      const { error: audioUploadError } = await supabase.storage
        .from("audio")
        .upload(audioFileName, mixedBlob, {
          cacheControl: "3600",
          upsert: false,
        });

      if (audioUploadError) throw audioUploadError;

      const {
        data: { publicUrl: audioPublicUrl },
      } = supabase.storage.from("audio").getPublicUrl(audioFileName);

      let coverUrl = "";

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

      // Create the child post in database
      const newPost = {
        user_id: user.id,
        title: postData.title,
        description: postData.description || null,
        types: postData.types,
        _url: audioPublicUrl,
        cover_image_url: coverUrl || null,
        duration: null,
        is_remix: true,
        parent_post_id: parentPost.id, // Set the parent relationship
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdPost, error: postError } = await supabase
        .from("posts")
        .insert(newPost)
        .select()
        .single();

      if (postError) throw postError;

      // Update parent post to include this child in children_ids
      const currentChildren = parentPost.children_ids || [];
      const updatedChildren = [...currentChildren, createdPost.id];

      const { error: updateError } = await supabase
        .from("posts")
        .update({ children_ids: updatedChildren })
        .eq("id", parentPost.id);

      if (updateError) throw updateError;

      // Reset form and close dialog
      setCurrentStep(0);
      setAudioFile(null);
      setCoverFile(null);
      setCoverPreview("");
      setPostData({
        title: `Echo: ${parentPost.title}`,
        description: "",
        types: [],
      });
      setTrimStart(0);
      setTrimEnd(100);
      setCurrentType("");
      setMixedAudioBlob(null);
      setOpen(false);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Remix creation error:", error);
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
            <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
              <p>
                You're creating an echo of "<strong>{parentPost.title}</strong>"
              </p>
              <p className="mt-2">
                Upload an audio file to layer on top of the original.
              </p>
            </div>
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
              placeholder="Enter echo title"
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
              {postData.title || "Untitled Echo"}
            </div>

            {audioFile && (
              <div className="text-sm text-muted-foreground">
                Echo of: {parentPost.title}
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
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [coverPreview]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="hover:bg-transparent hover:opacity-70"
          title="Create Echo"
        >
          <Waypoints className="!w-6 !h-6" />
        </Button>
      </DialogTrigger>
      <VisuallyHidden>
        <DialogTitle>Create echo of {parentPost.title}</DialogTitle>
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
              {loading || uploading ? "Creating Echo..." : "Create Echo"}
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
