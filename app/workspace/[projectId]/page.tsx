"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getProject, isUserCollaborator } from "@/utils/projectService";
import type { CollaborativeProject } from "@/utils/projectService";
import { useMultiTrackPlayer } from "@/hooks/useMultiTrackPlayer";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/utils/supabase";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Menubar } from "@/components/ui/menubar";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { 
  Home, 
  Play, 
  Pause, 
  SkipBack, 
  Circle,
  MessageSquare,
  Music,
  PanelRight,
  Plus
} from "lucide-react";

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const projectId = params?.projectId as string | undefined;

  // Project state
  const [project, setProject] = useState<CollaborativeProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Track management
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);

  // Multi-track player
  const [playerState, playerControls] = useMultiTrackPlayer(projectId || null);

  // Recorder
  const [recorderState, recorderControls] = useAudioRecorder();
  const [isUploading, setIsUploading] = useState(false);

  // Time display
  const [bpm] = useState(120);

  // Load project
  useEffect(() => {
    async function loadProject() {
      if (!projectId || !user) return;

      try {
        setIsLoading(true);
        
        const canAccess = await isUserCollaborator(projectId, user.id);
        setHasAccess(canAccess);

        if (!canAccess) {
          setIsLoading(false);
          return;
        }

        const projectData = await getProject(projectId);
        setProject(projectData);
      } catch (err) {
        console.error("Error loading project:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProject();
  }, [projectId, user]);

  // Load tracks when project loads
  useEffect(() => {
    async function loadTracks() {
      if (!projectId) return;

      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('post_id', projectId)
        .order('track_number', { ascending: true });

      if (!error && data) {
        setTracks(data);
      }
    }

    if (project) {
      loadTracks();
    }
  }, [project, projectId]);

  // Add new empty track
  const handleAddTrack = async () => {
    if (!user || !projectId || !project) return;

    setIsCreatingTrack(true);
    try {
      const nextTrackNumber = (project.track_count || 0) + 1;

      const { data: newTrack, error } = await supabase
        .from('tracks')
        .insert({
          post_id: projectId,
          user_id: user.id,
          track_number: nextTrackNumber,
          title: `Track ${nextTrackNumber}`,
          audio_url: "",
          duration: null,
          volume: 1.0,
          pan: 0.0,
          is_muted: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating track:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error(`Failed to create track: ${error.message || 'Unknown error'}`);
        setIsCreatingTrack(false);
        return;
      }

      if (!newTrack) {
        console.error('No track data returned');
        toast.error('Failed to create track: No data returned');
        setIsCreatingTrack(false);
        return;
      }

      // Update project track count
      const { error: updateError } = await supabase
        .from('posts')
        .update({ track_count: nextTrackNumber })
        .eq('id', projectId);

      if (updateError) {
        console.error('Error updating track count:', updateError);
      }

      // Add to local state
      setTracks(prev => [...prev, newTrack]);
      setSelectedTrackId(newTrack.id);
      
      // Reload project
      const updatedProject = await getProject(projectId);
      setProject(updatedProject);

      toast.success('Track added!');
    } catch (err) {
      console.error('Error adding track:', err);
      toast.error(`Failed to add track: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreatingTrack(false);
    }
  };

  // Record into selected track
  const handleRecord = async () => {
    if (!user || !projectId || !selectedTrackId) {
      toast.error('Please select a track first');
      return;
    }

    if (recorderState.isRecording) {
      // Stop recording and save to selected track
      setIsUploading(true);
      try {
        const blob = await recorderControls.stopRecording();
        
        if (!blob) {
          toast.error("Failed to stop recording");
          setIsUploading(false);
          return;
        }

        const selectedTrack = tracks.find(t => t.id === selectedTrackId);
        if (!selectedTrack) {
          toast.error("Selected track not found");
          setIsUploading(false);
          return;
        }

        // Upload the recording
        const timestamp = Date.now();
        const filename = `${projectId}/${timestamp}_track_${selectedTrack.track_number}.webm`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio')
          .upload(filename, blob, {
            contentType: 'audio/webm',
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error('Error uploading audio:', uploadError);
          toast.error("Failed to upload recording");
          setIsUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('audio')
          .getPublicUrl(uploadData.path);

        // Get duration
        const audio = new Audio();
        const audioUrl = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            resolve();
          });
          audio.src = audioUrl;
        });
        const duration = Math.floor(audio.duration);
        URL.revokeObjectURL(audioUrl);

        // Update track with audio URL and duration
        const { error: updateError } = await supabase
          .from('tracks')
          .update({
            audio_url: urlData.publicUrl,
            duration: duration,
          })
          .eq('id', selectedTrackId);

        if (updateError) {
          console.error('Error updating track:', updateError);
          toast.error("Failed to save recording");
          setIsUploading(false);
          return;
        }

        toast.success("Recording saved!");
        
        // Reload tracks
        const { data: updatedTracks } = await supabase
          .from('tracks')
          .select('*')
          .eq('post_id', projectId)
          .order('track_number', { ascending: true });

        if (updatedTracks) {
          setTracks(updatedTracks);
        }

        // Reload multi-track player
        window.location.reload();
      } catch (err) {
        console.error("Error handling recording:", err);
        toast.error("Recording failed");
      } finally {
        setIsUploading(false);
      }
    } else {
      // Start recording
      await recorderControls.startRecording();
    }
  };

  // Transport controls
  const handlePlayPause = () => {
    if (playerState.isPlaying) {
      playerControls.pause();
    } else {
      playerControls.play();
    }
  };

  const handleStop = () => {
    playerControls.stop();
  };

  // Format time helpers
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  const getCurrentBar = (): number => {
    const beatsPerBar = 4;
    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * beatsPerBar;
    return Math.floor(playerState.currentTime / secondsPerBar);
  };

  const getCurrentBeat = (): number => {
    const secondsPerBeat = 60 / bpm;
    const beatInBar = Math.floor((playerState.currentTime % (secondsPerBeat * 4)) / secondsPerBeat);
    return beatInBar;
  };

  // Loading states
  if (!user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#2a2a2a]">
        <div className="text-white text-description font-source-sans">
          Please sign in to access workspace
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#2a2a2a]">
        <LoadingSpinner size={48} className="text-white" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="w-screen h-screen flex flex-col gap-4 items-center justify-center bg-[#2a2a2a]">
        <div className="text-white text-description font-source-sans">
          You don't have access to this project
        </div>
        <Button
          onClick={() => router.push("/messages")}
          className="bg-primary text-primary-foreground"
        >
          Back to Messages
        </Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#2a2a2a]">
        <div className="text-white text-description font-source-sans">
          Project not found
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider open={showChat} onOpenChange={setShowChat}>
      <div className="w-screen h-screen flex flex-col bg-[#2a2a2a] overflow-hidden">
        {/* Top bar */}
        <div className="w-full bg-background px-4 py-3 flex flex-row justify-between items-end z-50">
          {/* Left section */}
          <div className="flex flex-row gap-3 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/messages")}
            >
              <Home size={20} />
            </Button>

            <Button
              className="bg-black text-white hover:bg-black/90 font-source-sans"
              size="sm"
            >
              Publish
            </Button>
          </div>

          {/* Center section - Transport controls */}
          <div className="flex flex-row gap-6 items-center">
            {/* Media buttons */}
            <Menubar className="rounded-full">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStop}
                className="hover:bg-transparent"
                disabled={!playerState.isPlaying && playerState.currentTime === 0}
              >
                <SkipBack size={20} className="fill-black" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className="hover:bg-transparent"
                disabled={playerState.tracks.size === 0}
              >
                {playerState.isPlaying ? 
                  <Pause size={20} className="fill-black" /> : 
                  <Play size={20} className="fill-black" />
                }
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRecord}
                className={`hover:bg-transparent hover:text-destructive ${
                  recorderState.isRecording ? 'text-destructive' : ''
                }`}
                disabled={isUploading || !selectedTrackId}
              >
                {isUploading ? (
                  <LoadingSpinner size={20} />
                ) : (
                  <Circle size={20} fill={recorderState.isRecording ? 'currentColor' : 'none'} />
                )}
              </Button>
            </Menubar>

            {/* Time signature */}
            <Menubar className="rounded-full h-full">
              <div className="flex flex-row items-center px-2">
                <div className="flex flex-col items-center">
                  <span className="text-description">{getCurrentBar().toString().padStart(3, '0')}</span>
                  <span className="text-muted-foreground uppercase text-metadata">Bar</span>
                </div>
                <div className="flex flex-col items-center uppercase text-metadata">
                  <span className="text-description">.</span>
                  <span className="text-white">.</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-description">{getCurrentBeat()}</span>
                  <span className="text-muted-foreground uppercase text-metadata">Beat</span>
                </div>   
              </div>
              
              <Separator orientation="vertical" className="!h-10" />

              <div className="flex flex-col items-center px-2">
                <span className="text-description">{bpm}</span>
                <span className="text-muted-foreground uppercase text-metadata">BPM</span>
              </div>
              
              <Separator orientation="vertical" className="!h-10" />

              <div className="flex flex-col items-center px-2">
                <span className="text-description">{formatTime(playerState.currentTime)}</span>
                <span className="text-muted-foreground uppercase text-metadata">Time</span>
              </div>
            </Menubar>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
            >
              <Music size={20} />
            </Button>
          </div>

          {/* Right section - Project info */}
          <div className="flex flex-col gap-2 items-left">
            <span className="text-title font-plex-serif">
              {project.title}
            </span>
            <div className="flex flex-row gap-8 items-center">
              {/* Collaborator avatars */}
              <div className="flex flex-row gap-4 items-center">
                {project.post_authors.map((author) => (
                  <Avatar
                    key={author.user_id}
                    src={author.profiles?.avatar_url ?? undefined}
                    alt={author.profiles?.name || "User"}
                    className="w-8 h-8"
                  />
                ))}
                <Button size="icon" variant="outline" className="rounded-full">
                  <Plus />
                </Button>
              </div>
              <Button size="icon" variant="outline" onClick={() => setShowChat(!showChat)}>
                <PanelRight />
              </Button>
            </div>
          </div>
        </div>

        {/* Main workspace area */}
        <div className="flex-1 flex flex-row overflow-hidden">
          {/* Left sidebar - Tracks */}
          <div className="w-48 bg-[#d9c5a8] p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="flex flex-row justify-between items-center mb-2">
              <span className="text-sub-description font-source-sans font-medium">
                Tracks
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 bg-transparent backdrop-blur-md"
                onClick={handleAddTrack}
                disabled={isCreatingTrack}
              >
                {isCreatingTrack ? (
                  <LoadingSpinner size={14} />
                ) : (
                  <Plus size={14} />
                )}
              </Button>
            </div>
            
            {tracks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground text-sub-description font-source-sans">
                  No tracks yet
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {tracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedTrackId(track.id)}
                    className={`p-2 rounded text-left transition-colors ${
                      selectedTrackId === track.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background/30 backdrop-blur-sm hover:bg-background/50'
                    }`}
                  >
                    <div className="text-sub-description font-source-sans">
                      {track.audio_url ? '🎵' : '⚪'} {track.title}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center - Timeline */}
          <div className="flex-1 bg-[#3a3a3a] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-12 bg-[#4a4a4a] border-b border-[#2a2a2a] flex items-center px-4">
              <div className="flex-1 flex flex-row text-xs text-gray-400 font-source-sans">
                {[1, 3, 5, 7, 9, 11, 13, 15, 17, 19].map((num) => (
                  <div key={num} className="flex-1 text-center">
                    {num}
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute top-12 bottom-0 left-0 right-0 flex items-center justify-center">
              {tracks.length === 0 ? (
                <div className="text-center text-gray-500 text-description font-source-sans">
                  Timeline - No tracks yet
                </div>
              ) : (
                <div className="text-center text-gray-500 text-description font-source-sans">
                  Track visualization coming soon
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar - Chat */}
          <Sidebar side="right" className="z-10">
            <SidebarHeader>
              <div className="flex flex-row justify-between items-center">
                <span className="text-sub-description font-source-sans font-medium">
                  Project Chat
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowChat(false)}
                >
                  <MessageSquare size={16} />
                </Button>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground text-sub-description font-source-sans">
                  No messages yet
                </div>
              </div>
            </SidebarContent>

            <SidebarFooter>
              <Input
                type="text"
                placeholder="Type a message..."
                className="text-sub-description font-source-sans"
              />
            </SidebarFooter>
          </Sidebar>
        </div>
      </div>
    </SidebarProvider>
  );
}