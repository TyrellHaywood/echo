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
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

  // Audio mixing settings
  const [parentVolume, setParentVolume] = useState(0.5);
  const [newVolume, setNewVolume] = useState(0.5);
  const [shouldMixAudio, setShouldMixAudio] = useState(true);

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

  // Check audio compatibility before upload
  const checkAudioCompatibility = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();

        audioContext.decodeAudioData(
          reader.result as ArrayBuffer,
          () => {
            // Successfully decoded
            audioContext.close();
            resolve(true);
          },
          () => {
            // Failed to decode
            audioContext.close();
            resolve(false);
          }
        );
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file);
    });
  };

  // Updated handleAudioUpload with compatibility check
  const handleAudioUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError("");

    try {
      // Check if the browser can decode the audio
      const isCompatible = await checkAudioCompatibility(file);
      if (!isCompatible) {
        setError(
          "The selected audio format is not supported. Please use MP3, WAV, or OGG formats."
        );
        return;
      }

      setAudioFile(file);
    } catch (error: any) {
      setError(`Error checking audio file: ${error.message}`);
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
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Fallback function for audio loading
  const getFallbackAudio = (url: string): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = url;
      audio.addEventListener("canplaythrough", () => resolve(audio));
      audio.addEventListener("error", () =>
        reject(new Error("Failed to load audio"))
      );
      audio.load();
    });
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Function to get a signed URL for Supabase Storage files
  const getSignedUrl = async (url: string): Promise<string> => {
    try {
      // If it's not a Supabase storage URL, return the original URL
      if (
        !url.includes("storage.googleapis.com") &&
        !url.includes("supabase")
      ) {
        return url;
      }

      // Try to extract the path from the URL
      let path = url;

      // If URL contains "audio", try to extract the path after "audio/"
      if (url.includes("/audio/")) {
        path = url.split("/audio/")[1];
      }
      // If URL contains "storage/v1/object/public", extract path after bucket name
      else if (url.includes("storage/v1/object/public")) {
        const parts = url.split("/public/");
        if (parts.length > 1) {
          path = parts[1];
        }
      }

      // Try to get a signed URL using Supabase
      const { data, error } = await supabase.storage
        .from("audio")
        .createSignedUrl(path, 60);

      if (error) {
        console.error("Error getting signed URL:", error);
        return url; // Fall back to the original URL
      }

      if (data?.signedUrl) {
        return data.signedUrl;
      }

      return url;
    } catch (err) {
      console.error("Error in getSignedUrl:", err);
      return url; // Fall back to the original URL
    }
  };

  // Improved audio mixing function with better error handling
  const mixAudioFiles = async (
    parentAudioUrl: string,
    newAudioFile: File
  ): Promise<Blob> => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      } catch (err) {
        console.error("Failed to create audio context:", err);
        throw new Error("Your browser doesn't support audio processing");
      }
    }

    const audioContext = audioContextRef.current;

    try {
      // Try to get a signed URL for better access
      const signedParentUrl = await getSignedUrl(parentAudioUrl);

      // Fix URL issues by ensuring it's properly encoded
      let cleanUrl = signedParentUrl;

      // If the URL has spaces or other problematic characters, encode it
      if (!cleanUrl.startsWith("blob:") && cleanUrl.includes(" ")) {
        const urlParts = cleanUrl.split("/");
        const lastPart = urlParts[urlParts.length - 1];
        const encodedLastPart = encodeURIComponent(lastPart);
        urlParts[urlParts.length - 1] = encodedLastPart;
        cleanUrl = urlParts.join("/");
      }

      // Add error handling for parent audio fetch with better options
      const parentResponse = await fetch(cleanUrl, {
        mode: "cors", // Add explicit CORS mode
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        // Remove credentials: "same-origin" as it may cause CORS issues
      });

      if (!parentResponse.ok) {
        throw new Error(
          `Failed to fetch parent audio: ${parentResponse.status} - ${parentResponse.statusText}`
        );
      }

      const parentArrayBuffer = await parentResponse.arrayBuffer();
      if (!parentArrayBuffer || parentArrayBuffer.byteLength === 0) {
        throw new Error("Parent audio buffer is empty");
      }

      // Try decoding the parent audio
      let parentAudioBuffer;
      try {
        // Create a copy of the buffer to avoid issues with buffer ownership
        const bufferCopy = parentArrayBuffer.slice(0);
        parentAudioBuffer = await audioContext.decodeAudioData(bufferCopy);
      } catch (decodeError) {
        console.error("Failed to decode parent audio:", decodeError);

        // Try fallback method using a new audio context if Web Audio API fails
        try {
          // Create a new audio element and try playing it directly
          const audio = new Audio();
          audio.crossOrigin = "anonymous";
          audio.src = cleanUrl;

          // Return to a simpler approach - just try to load without mixing
          return await new Promise((resolve, reject) => {
            audio.oncanplaythrough = async () => {
              try {
                // If we can play the audio, we'll convert the new audio to WAV
                // and return it without mixing

                // Try to load and decode the new audio
                const newArrayBuffer = await newAudioFile.arrayBuffer();
                const newBuffer = await audioContext.decodeAudioData(
                  newArrayBuffer.slice(0)
                );

                // Convert the new buffer to WAV
                const newWav = await bufferToWav(newBuffer);
                resolve(newWav);
              } catch (err) {
                reject(
                  new Error(
                    `Fallback failed: ${
                      typeof err === "object" &&
                      err !== null &&
                      "message" in err
                        ? (err as { message?: string }).message
                        : String(err)
                    }`
                  )
                );
              }
            };

            audio.onerror = () => {
              reject(
                new Error("Failed to load parent audio via fallback method")
              );
            };

            // Start loading the audio
            audio.load();
          });
        } catch (fallbackError) {
          console.error("Fallback method failed:", fallbackError);
          throw new Error(
            `Failed to decode parent audio. Please try a different format.`
          );
        }
      }

      // Load new audio file with error handling
      const newAudioArrayBuffer = await newAudioFile.arrayBuffer();
      if (!newAudioArrayBuffer || newAudioArrayBuffer.byteLength === 0) {
        throw new Error("New audio buffer is empty");
      }

      // Try decoding the new audio
      let newAudioBuffer;
      try {
        // Create a copy of the buffer to avoid issues with buffer ownership
        const bufferCopy = newAudioArrayBuffer.slice(0);
        newAudioBuffer = await audioContext.decodeAudioData(bufferCopy);
      } catch (decodeError) {
        console.error("Failed to decode new audio:", decodeError);
        throw new Error(
          `Failed to decode new audio: ${
            typeof decodeError === "object" &&
            decodeError !== null &&
            "message" in decodeError
              ? (decodeError as { message?: string }).message
              : String(decodeError)
          }`
        );
      }

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

      // Mix the audio with error handling
      try {
        // Mix the audio
        for (
          let channel = 0;
          channel < mixedBuffer.numberOfChannels;
          channel++
        ) {
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

          // Mix the audio (with configurable volume)
          for (let i = 0; i < maxLength; i++) {
            const parentSample =
              i < parentData.length ? parentData[i] * parentVolume : 0;
            const newSample = i < newData.length ? newData[i] * newVolume : 0;
            mixedData[i] = parentSample + newSample;

            // Prevent clipping
            if (mixedData[i] > 1) mixedData[i] = 1;
            if (mixedData[i] < -1) mixedData[i] = -1;
          }
        }
      } catch (mixingError) {
        console.error("Error during audio mixing:", mixingError);
        throw new Error(
          `Error during audio mixing: ${
            typeof mixingError === "object" &&
            mixingError !== null &&
            "message" in mixingError
              ? (mixingError as { message?: string }).message
              : String(mixingError)
          }`
        );
      }

      // Convert buffer to WAV blob
      const wavBlob = await bufferToWav(mixedBuffer, 0.7);
      return wavBlob;
    } catch (error) {
      console.error("Error mixing audio:", error);
      throw new Error(
        `Failed to mix audio files: ${
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message?: string }).message
            : String(error)
        }`
      );
    }
  };

  // Helper function to convert AudioBuffer to compressed WAV Blob
  const bufferToWav = async (
    buffer: AudioBuffer,
    quality: number = 0.7
  ): Promise<Blob> => {
    const length = buffer.length;
    const numberOfChannels = Math.min(buffer.numberOfChannels, 2); // Limit to stereo
    const sampleRate = Math.min(buffer.sampleRate, 44100); // Limit sample rate

    // Calculate downsampling ratio
    const downsampleRatio = buffer.sampleRate / sampleRate;
    const downsampledLength = Math.floor(length / downsampleRatio);

    const arrayBuffer = new ArrayBuffer(
      44 + downsampledLength * numberOfChannels * 2
    );
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + downsampledLength * numberOfChannels * 2, true);
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
    view.setUint32(40, downsampledLength * numberOfChannels * 2, true);

    // Convert float samples to 16-bit PCM with downsampling
    let offset = 44;
    for (let i = 0; i < downsampledLength; i++) {
      const sourceIndex = Math.floor(i * downsampleRatio);
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(
          Math.min(channel, buffer.numberOfChannels - 1)
        );
        const sample =
          sourceIndex < channelData.length ? channelData[sourceIndex] : 0;

        // Apply light compression
        const compressed = sample * quality;
        const intSample =
          compressed < 0 ? compressed * 0x8000 : compressed * 0x7fff;
        view.setInt16(
          offset,
          Math.max(-32768, Math.min(32767, intSample)),
          true
        );
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

    if (!parentPost || !parentPost._url) {
      setError("Parent post audio URL is missing");
      return;
    }

    // Validate parent audio URL
    if (!isValidUrl(parentPost._url)) {
      setError("Invalid parent audio URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      setUploading(true);

      // Get a proper signed URL for the parent audio
      const signedUrl = await getSignedUrl(parentPost._url);

      // Skip the HEAD request check as it may fail due to CORS

      // Mix the parent audio with the new audio
      const mixedBlob = await mixAudioFiles(signedUrl, audioFile);
      setMixedAudioBlob(mixedBlob);

      // Upload mixed audio file
      const audioFileName = `${user.id}/${Date.now()}_remix_audio.wav`;

      const { error: audioUploadError } = await supabase.storage
        .from("audio")
        .upload(audioFileName, mixedBlob, {
          cacheControl: "3600",
          upsert: false,
        });

      if (audioUploadError) {
        console.error("Audio upload error:", audioUploadError);
        throw new Error(`Failed to upload audio: ${audioUploadError.message}`);
      }

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

        if (coverUploadError) {
          console.error("Cover upload error:", coverUploadError);
          throw new Error(
            `Failed to upload cover image: ${coverUploadError.message}`
          );
        }

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

      if (postError) {
        console.error("Database error creating post:", postError);
        throw new Error(`Failed to create post: ${postError.message}`);
      }

      // Update parent post to include this child in children_ids
      const currentChildren = parentPost.children_ids || [];
      const updatedChildren = [...currentChildren, createdPost.id];

      const { error: updateError } = await supabase
        .from("posts")
        .update({ children_ids: updatedChildren })
        .eq("id", parentPost.id);

      if (updateError) {
        console.error("Error updating parent post:", updateError);
        throw new Error(`Failed to update parent post: ${updateError.message}`);
      }

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
      setError(error.message || "An unknown error occurred");
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
            {/* Audio mixing options */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="parentVolume" className="text-sm">
                  Original Volume: {Math.round(parentVolume * 100)}%
                </label>
                <input
                  id="parentVolume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={parentVolume}
                  onChange={(e) => setParentVolume(parseFloat(e.target.value))}
                  className="w-1/2"
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="newVolume" className="text-sm">
                  Your Audio Volume: {Math.round(newVolume * 100)}%
                </label>
                <input
                  id="newVolume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={newVolume}
                  onChange={(e) => setNewVolume(parseFloat(e.target.value))}
                  className="w-1/2"
                />
              </div>
            </div>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
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
              {loading || uploading ? <LoadingSpinner /> : "Create Echo"}
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
