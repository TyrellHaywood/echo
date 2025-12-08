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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { TrackWaveform } from "@/components/workspace/TrackWaveform";
import { TrackControl } from "@/components/workspace/TrackControl";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import PublishDialog from '@/components/workspace/PublishDialog';
import { ProjectChat } from '@/components/workspace/ProjectChat';
import { usePresence } from '@/hooks/usePresence';
import { useRealtimeTrackUpdates } from '@/hooks/useRealtimeTrackUpdates';
import { useCursorTracking } from '@/hooks/useCursorTracking';
import { Cursor } from '@/components/workspace/Cursor';
import { toast } from "sonner";
import { MessageSquare, Plus } from "lucide-react";

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const projectId = params?.projectId as string;

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

  // Cursor ref
  const workspaceRef = useRef<HTMLDivElement>(null);
  // Cursor tracking
const { cursors, userColor } = useCursorTracking(projectId, user?.id || null, workspaceRef);

  // Track colors for waveforms
  const trackColors = [
    "#e09145", "#46b1c9", "#e17878", "#7ba05b", "#9b72b0", "#d4a259",
  ];

  // Real-time presence
  const { onlineUsers } = usePresence(projectId, user?.id || null);

  // Real-time track updates
  useRealtimeTrackUpdates(projectId, async () => {
    // Reload tracks when any collaborator makes changes
    if (!projectId) return;
    
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('post_id', projectId)
      .order('track_number', { ascending: true });

    if (error) {
      console.error('Error reloading tracks:', error);
      return;
    }

    if (data) {
      const userIds = [...new Set(data.map(t => t.user_id))].filter((id): id is string => id !== null);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds);

      const tracksWithProfiles = data.map(track => ({
        ...track,
        profiles: profiles?.find(p => p.id === track.user_id) || null
      }));

      setTracks(tracksWithProfiles);
    }
  });

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

      if (error) {
        console.error('Error loading tracks:', error);
        return;
      }

      if (data) {
        // Fetch profiles separately - filter out null user_ids
        const userIds = [...new Set(data.map(t => t.user_id))].filter((id): id is string => id !== null);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds);

        const tracksWithProfiles = data.map(track => ({
          ...track,
          profiles: profiles?.find(p => p.id === track.user_id) || null
        }));

        setTracks(tracksWithProfiles);
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

  const handleTimelineMouseUp = () => setIsScrubbing(false);

  useEffect(() => {
    if (isScrubbing) {
      const handleGlobalMouseUp = () => setIsScrubbing(false);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isScrubbing]);

  // Track control handlers
  const handleVolumeChange = (trackId: string, volume: number) => {
    playerControls.setTrackVolume(trackId, volume);
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, volume } : t));
  };

  const handleMuteToggle = (trackId: string) => {
    playerControls.toggleTrackMute(trackId);
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, is_muted: !t.is_muted } : t));
  };

  const handleSoloToggle = (trackId: string) => {
    playerControls.toggleTrackSolo(trackId);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;

    try {
      const { error } = await supabase.from('tracks').delete().eq('id', trackId);
      if (error) {
        toast.error('Failed to delete track');
        return;
      }

      setTracks(prev => prev.filter(t => t.id !== trackId));
      if (selectedTrackId === trackId) setSelectedTrackId(null);
      toast.success('Track deleted');
    } catch (err) {
      console.error('Error deleting track:', err);
      toast.error('Failed to delete track');
    }
  };

  const handleTrackNameUpdate = (trackId: string, newName: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, title: newName } : t));
  };

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

      if (error || !newTrack) {
        toast.error('Failed to create track');
        setIsCreatingTrack(false);
        return;
      }

      // Update project track count
      await supabase.from('posts').update({ track_count: nextTrackNumber }).eq('id', projectId);

      // Add profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .single();

      setTracks(prev => [...prev, { ...newTrack, profiles: profile }]);
      setSelectedTrackId(newTrack.id);

      const updatedProject = await getProject(projectId);
      setProject(updatedProject);

      toast.success('Track added!');
    } catch (err) {
      console.error('Error adding track:', err);
      toast.error('Failed to add track');
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
          toast.error(`Failed to upload recording: ${uploadError.message}`);
          setIsUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage.from('audio').getPublicUrl(uploadData.path);

        // Get duration
        let duration = 0;
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          duration = Math.floor(audioBuffer.duration);
          await audioContext.close();
        } catch (err) {
          console.error('Error getting duration:', err);
          duration = Math.floor(blob.size / 16000);
        }

        await supabase
          .from('tracks')
          .update({ audio_url: urlData.publicUrl, duration })
          .eq('id', selectedTrackId);

        toast.success("Recording saved!");

        // Reload tracks
        const { data: updatedTracks } = await supabase
          .from('tracks')
          .select('*')
          .eq('post_id', projectId)
          .order('track_number', { ascending: true});

        if (updatedTracks) {
          const userIds = [...new Set(updatedTracks.map(t => t.user_id))].filter((id): id is string => id !== null);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', userIds);

          const tracksWithProfiles = updatedTracks.map(track => ({
            ...track,
            profiles: profiles?.find(p => p.id === track.user_id) || null
          }));

          setTracks(tracksWithProfiles);
        }

        await playerControls.reload();
        setIsUploading(false);
      } catch (err) {
        console.error("Error handling recording:", err);
        toast.error('Recording failed');
        setIsUploading(false);
      }
    } else {
      try {
        await recorderControls.startRecording();
      } catch (err) {
        console.error('Error starting recording:', err);
        toast.error('Failed to start recording');
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

  const handleStop = () => playerControls.stop();

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
        <Button onClick={() => router.push("/messages")} className="bg-primary text-primary-foreground">
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
        {/* Header */}
        <WorkspaceHeader
          project={project}
          isPlaying={playerState.isPlaying}
          isRecording={recorderState.isRecording}
          isUploading={isUploading}
          currentTime={playerState.currentTime}
          tracksCount={playerState.tracks.size}
          bpm={bpm}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onRecord={handleRecord}
          onNavigateHome={() => router.push("/messages")}
          onPublish={() => {}}
          onToggleChat={() => setShowChat(!showChat)}
          formatTime={formatTime}
          getCurrentBar={getCurrentBar}
          getCurrentBeat={getCurrentBeat}
          hasSelectedTrack={!!selectedTrackId}
          onlineCollaborators={onlineUsers}
          publishButton={
            <PublishDialog
              projectId={projectId}
              tracks={tracks}
              projectTitle={project.title}
            />
          }
        />

        {/* Main workspace area */}
        <div 
          ref={workspaceRef}
          className="flex-1 flex flex-row overflow-hidden relative"
        >
          {/* Render other users' cursors */}
          {Array.from(cursors.values()).map((cursor) => (
            <Cursor
              key={cursor.userId}
              x={cursor.x}
              y={cursor.y}
              name={cursor.name}
              avatarUrl={cursor.avatarUrl}
              color={cursor.color}
            />
          ))}

          {/* Left sidebar - Tracks with controls */}
          <div className="w-80 bg-[#d9c5a8] flex flex-col overflow-y-auto">
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
                {isCreatingTrack ? <LoadingSpinner size={14} /> : <Plus size={14} />}
              </Button>
            </div>
            
            {tracks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-3">
                <div className="text-center text-muted-foreground text-sub-description font-source-sans">
                  No tracks yet
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-2">
                {tracks.map((track) => (
                  <TrackControl
                    key={track.id}
                    track={track}
                    isSelected={selectedTrackId === track.id}
                    onSelect={() => setSelectedTrackId(track.id)}
                    onVolumeChange={handleVolumeChange}
                    onMuteToggle={handleMuteToggle}
                    onSoloToggle={handleSoloToggle}
                    onDelete={handleDeleteTrack}
                    onNameUpdate={handleTrackNameUpdate}
                  />
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
              {/* Playhead */}
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
                      className={`h-20 border-b border-[#2a2a2a] flex items-center ${
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
                          isMuted={track.is_muted}
                        />
                      ) : (
                        <div className="text-gray-500 text-sub-description font-source-sans italic px-4">
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
                <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                  <MessageSquare size={16} />
                </Button>
              </div>
            </SidebarHeader>

            <SidebarContent className="p-0">
              {user && (
                <ProjectChat projectId={projectId} currentUserId={user.id} />
              )}
            </SidebarContent>
          </Sidebar>
        </div>
      </div>
    </SidebarProvider>
  );
}