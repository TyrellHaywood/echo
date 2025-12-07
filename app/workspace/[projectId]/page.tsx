"use client";

import { useEffect, useState, useRef } from "react";
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
import { TrackWaveform } from "@/components/workspace/TrackWaveform";
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
  const pixelsPerSecond = 50;

  // Scrubbing state
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Track colors for waveforms
  const trackColors = [
    "#e09145", // Orange
    "#46b1c9", // Blue
    "#e17878", // Red
    "#7ba05b", // Green
    "#9b72b0", // Purple
    "#d4a259", // Yellow
  ];

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

  // Scrubbing handlers
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || playerState.duration === 0) return;
    
    setIsScrubbing(true);
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = x / pixelsPerSecond;
    const clampedTime = Math.max(0, Math.min(newTime, playerState.duration));
    playerControls.seek(clampedTime);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrubbing || !timelineRef.current || playerState.duration === 0) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = x / pixelsPerSecond;
    const clampedTime = Math.max(0, Math.min(newTime, playerState.duration));
    playerControls.seek(clampedTime);
  };

  const handleTimelineMouseUp = () => {
    setIsScrubbing(false);
  };

  useEffect(() => {
    if (isScrubbing) {
      const handleGlobalMouseUp = () => setIsScrubbing(false);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isScrubbing]);

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
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading audio:', uploadError);
          toast.error(`Failed to upload recording: ${uploadError.message}`);
          setIsUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('audio')
          .getPublicUrl(uploadData.path);

        // Get duration - improved method
        let duration = 0;
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          duration = Math.floor(audioBuffer.duration);
          await audioContext.close();
          console.log('Audio duration from AudioContext:', duration);
        } catch (err) {
          console.error('Error getting duration from AudioContext:', err);
          // Fallback to Audio element
          const audio = new Audio();
          const audioUrl = URL.createObjectURL(blob);
          await new Promise<void>((resolve) => {
            audio.addEventListener('loadedmetadata', () => {
              if (isFinite(audio.duration)) {
                duration = Math.floor(audio.duration);
              }
              resolve();
            });
            audio.addEventListener('error', () => {
              resolve();
            });
            audio.src = audioUrl;
          });
          URL.revokeObjectURL(audioUrl);
          console.log('Audio duration from Audio element:', duration);
        }

        // If still 0, estimate from blob size (approximate)
        if (duration === 0) {
          duration = Math.floor(blob.size / 16000); // Rough estimate: 16KB per second
          console.log('Estimated duration from blob size:', duration);
        }

        console.log('Final duration:', duration);
        console.log('Public URL:', urlData.publicUrl);

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
        
        // Reload tracks to update UI
        const { data: updatedTracks, error: tracksError } = await supabase
          .from('tracks')
          .select('*')
          .eq('post_id', projectId)
          .order('track_number', { ascending: true });

        if (!tracksError && updatedTracks) {
          setTracks(updatedTracks);
        }

        // Reload player
        await playerControls.reload();
        
        setIsUploading(false);
      } catch (err) {
        console.error("Error handling recording:", err);
        toast.error(`Recording failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsUploading(false);
      }
    } else {
      try {
        await recorderControls.startRecording();
      } catch (err) {
        console.error('Error starting recording:', err);
        toast.error(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
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
                disabled={!playerState.isPlaying && playerState.currentTime === 0}
              >
                <SkipBack size={20} className="fill-black" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
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
                className={recorderState.isRecording ? 'text-destructive' : ''}
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
          <div className="w-48 bg-[#d9c5a8] flex flex-col overflow-y-auto">
            <div className="flex flex-row justify-between items-center p-3 pb-2">
              <span className="text-sub-description font-source-sans font-medium">
                Tracks
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
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
              <div className="flex-1 flex items-center justify-center p-3">
                <div className="text-center text-muted-foreground text-sub-description font-source-sans">
                  No tracks yet
                </div>
              </div>
            ) : (
              <div className="flex flex-col pt-1">
                {tracks.map((track) => (
                  <Button
                    key={track.id}
                    onClick={() => {
                      setSelectedTrackId(track.id);
                    }}
                    className={`h-16  transition-colors bg-transparent ${selectedTrackId === track.id ? 'bg-primary' : '' }`}
                    variant="default"
                  >
                    <span className="text-sub-description font-source-sans">
                      {track.title}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Center - Timeline */}
          <div className="flex-1 bg-[#3a3a3a] relative overflow-x-auto overflow-y-hidden">
            {/* Timeline header with bar numbers */}
            <div className="sticky top-0 left-0 right-0 h-12 bg-[#4a4a4a] border-b border-[#2a2a2a] flex items-center px-4 z-10">
              <div className="flex-1 flex flex-row text-xs text-gray-400 font-source-sans">
                {Array.from({ length: 20 }, (_, i) => i * 2 + 1).map((num) => (
                  <div key={num} className="flex-1 text-center min-w-[80px]">
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* Track rows with waveforms */}
            <div 
              ref={timelineRef}
              className="absolute top-12 bottom-0 left-0 right-0 overflow-y-auto cursor-pointer"
              onMouseDown={handleTimelineMouseDown}
              onMouseMove={handleTimelineMouseMove}
              onMouseUp={handleTimelineMouseUp}
            >
              {/* Playhead - scrubber / show current position */}
              {playerState.duration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
                  style={{
                    left: `${playerState.currentTime * pixelsPerSecond}px`,
                    transition: playerState.isPlaying || isScrubbing ? 'none' : 'left 0.1s',
                  }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
                </div>
              )}

              {tracks.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500 text-description font-source-sans">
                    No tracks yet. Click + to add a track.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className={`h-full border-b border-[#2a2a2a] flex items-center ${
                        selectedTrackId === track.id ? 'bg-[#4a4a4a]' : ''
                      }`}
                      onClick={() => setSelectedTrackId(track.id)}
                    >
                      {track.audio_url && track.duration ? (
                        <TrackWaveform
                          audioUrl={track.audio_url}
                          duration={track.duration}
                          trackTitle={track.title || `Track ${track.track_number}`}
                          color={trackColors[index % trackColors.length]}
                          pixelsPerSecond={pixelsPerSecond}
                        />
                      ) : (
                        <div className="text-gray-500 text-sub-description font-source-sans italic">
                          Empty - Record to add audio
                        </div>
                      )}
                    </div>
                  ))}
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