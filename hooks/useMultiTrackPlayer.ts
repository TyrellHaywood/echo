import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { Database } from '@/types/supabase';

type Track = Database['public']['Tables']['tracks']['Row'];

interface TrackState {
  id: string;
  audio: HTMLAudioElement | null;
  isLoaded: boolean;
  error: string | null;
}

interface MultiTrackPlayerState {
  isPlaying: boolean;
  isRecording: boolean;
  currentTime: number;
  duration: number;
  tracks: Map<string, TrackState>;
  error: string | null;
}

interface MultiTrackControls {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackPan: (trackId: string, pan: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  reload: () => Promise<void>;
}

export function useMultiTrackPlayer(
  projectId: string | null
): [MultiTrackPlayerState, MultiTrackControls] {
  const [state, setState] = useState<MultiTrackPlayerState>({
    isPlaying: false,
    isRecording: false,
    currentTime: 0,
    duration: 0,
    tracks: new Map(),
    error: null,
  });

  const tracksRef = useRef<Map<string, TrackState>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const panNodesRef = useRef<Map<string, StereoPannerNode>>(new Map());
  const soloedTracksRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const isLoadingRef = useRef<boolean>(false); 
  const isCleaningUpRef = useRef<boolean>(false);

  const loadTracks = useCallback(async () => {
    if (!projectId || isLoadingRef.current || isCleaningUpRef.current) {
      console.log('Skipping loadTracks - already loading or cleaning up');
      return;
    }

    isLoadingRef.current = true;

    try {
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('post_id', projectId)
        .order('track_number', { ascending: true });

      if (error) {
        console.error('Error loading tracks:', error);
        setState(prev => ({ ...prev, error: 'Failed to load tracks' }));
        isLoadingRef.current = false;
        return;
      }

      if (!tracks || tracks.length === 0) {
        setState(prev => ({ ...prev, duration: 0 }));
        isLoadingRef.current = false;
        return;
      }

      // Filter out tracks without audio URLs
      const tracksWithAudio = tracks.filter(t => t.audio_url && t.audio_url.trim() !== '');
      
      if (tracksWithAudio.length === 0) {
        console.log('No tracks with audio to load');
        setState(prev => ({ ...prev, duration: 0, tracks: new Map() }));
        isLoadingRef.current = false;
        return;
      }

      // Ensure audio context is properly closed before creating a new one
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        console.log('Closing existing audio context...');
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Wait a bit to ensure context is fully closed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create fresh audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('Created new audio context:', audioContextRef.current.state);

      const audioContext = audioContextRef.current;
      const newTracksMap = new Map<string, TrackState>();
      let maxDuration = 0;
      let loadedCount = 0;

      // Create promises for all tracks
      const trackPromises = tracksWithAudio.map((track) => {
        return new Promise<void>((resolve) => {
          const audio = new Audio();
          audio.crossOrigin = 'anonymous';
          audio.preload = 'metadata';

          const trackState: TrackState = {
            id: track.id,
            audio,
            isLoaded: false,
            error: null,
          };

          // Set up Web Audio API connections FIRST
          try {
            const source = audioContext.createMediaElementSource(audio);
            
            const gainNode = audioContext.createGain();
            gainNode.gain.value = track.volume ?? 1.0;
            gainNodesRef.current.set(track.id, gainNode);

            const panNode = audioContext.createStereoPanner();
            panNode.pan.value = track.pan ?? 0;
            panNodesRef.current.set(track.id, panNode);

            source.connect(gainNode).connect(panNode).connect(audioContext.destination);
          } catch (err) {
            console.error(`Error setting up audio nodes for track ${track.id}:`, err);
            trackState.error = 'Failed to setup audio';
            newTracksMap.set(track.id, trackState);
            resolve();
            return;
          }

          // Event listeners
          const onLoadedMetadata = () => {
            console.log(`Track ${track.id} loaded, duration:`, audio.duration);
            trackState.isLoaded = true;
            
            let duration = audio.duration;
            if (!isFinite(duration)) {
              duration = track.duration || 0;
              console.log(`Using database duration for track ${track.id}:`, duration);
            }
            
            if (duration > maxDuration) {
              maxDuration = duration;
            }

            loadedCount++;
            newTracksMap.set(track.id, { ...trackState });
            
            // Update state after each track loads
            tracksRef.current = new Map(newTracksMap);
            setState(prev => ({ 
              ...prev, 
              tracks: new Map(newTracksMap),
              duration: maxDuration
            }));
            
            resolve();
          };

          const onError = (e: Event) => {
            console.error(`Error loading track ${track.id}:`, e, audio.error);
            trackState.error = 'Failed to load audio';
            newTracksMap.set(track.id, { ...trackState });
            
            tracksRef.current = new Map(newTracksMap);
            setState(prev => ({ ...prev, tracks: new Map(newTracksMap) }));
            
            resolve(); // Resolve anyway to not block other tracks
          };

          audio.addEventListener('loadedmetadata', onLoadedMetadata);
          audio.addEventListener('error', onError);

          // Now set src and load
          newTracksMap.set(track.id, trackState);
          audio.src = track.audio_url;
          audio.load();
        });
      });

      // Wait for all tracks to attempt loading (with timeout)
      await Promise.race([
        Promise.all(trackPromises),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);

      console.log(`Loaded ${loadedCount} of ${tracksWithAudio.length} tracks`);
    } catch (err) {
      console.error('Error in loadTracks:', err);
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Unknown error loading tracks' 
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [projectId]);

  useEffect(() => {
    loadTracks();

    return () => {
      isCleaningUpRef.current = true;
      
      // Stop playback first
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Pause and clean up all audio elements
      tracksRef.current.forEach((trackState) => {
        if (trackState.audio) {
          trackState.audio.pause();
          trackState.audio.removeEventListener('loadedmetadata', () => {});
          trackState.audio.removeEventListener('error', () => {});
          trackState.audio.src = '';
          trackState.audio.load(); // Clear the audio element
        }
      });
      tracksRef.current.clear();
      gainNodesRef.current.clear();
      panNodesRef.current.clear();
      
      // Close audio context asynchronously
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
          audioContextRef.current = null;
          isCleaningUpRef.current = false;
        });
      } else {
        isCleaningUpRef.current = false;
      }
    };
  }, [loadTracks]);

  const updateCurrentTime = useCallback(() => {
    const firstTrack = Array.from(tracksRef.current.values())[0];
    if (firstTrack?.audio && !firstTrack.audio.paused) {
      setState(prev => ({ ...prev, currentTime: firstTrack.audio!.currentTime }));
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
    }
  }, []);

  const controls: MultiTrackControls = {
    play: async () => {
      const allTracks = Array.from(tracksRef.current.values());
      
      if (allTracks.length === 0) {
        console.warn('No tracks to play');
        return;
      }

      const loadedTracks = allTracks.filter(t => t.isLoaded && !t.error);
      
      if (loadedTracks.length === 0) {
        console.warn('No loaded tracks available');
        console.log('Track states:', allTracks.map(t => ({ id: t.id, isLoaded: t.isLoaded, error: t.error })));
        return;
      }

      try {
        await Promise.all(
          loadedTracks.map(trackState => {
            if (trackState.audio) {
              return trackState.audio.play();
            }
            return Promise.resolve();
          })
        );

        setState(prev => ({ ...prev, isPlaying: true }));
        animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
      } catch (err) {
        console.error('Error playing tracks:', err);
        setState(prev => ({ 
          ...prev, 
          error: err instanceof Error ? err.message : 'Failed to play tracks' 
        }));
      }
    },

    pause: () => {
      tracksRef.current.forEach((trackState) => {
        if (trackState.audio) {
          trackState.audio.pause();
        }
      });

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      setState(prev => ({ ...prev, isPlaying: false }));
    },

    stop: () => {
      tracksRef.current.forEach((trackState) => {
        if (trackState.audio) {
          trackState.audio.pause();
          trackState.audio.currentTime = 0;
        }
      });

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    },

    seek: (time: number) => {
      tracksRef.current.forEach((trackState) => {
        if (trackState.audio) {
          trackState.audio.currentTime = time;
        }
      });

      setState(prev => ({ ...prev, currentTime: time }));
    },

    setTrackVolume: (trackId: string, volume: number) => {
      const gainNode = gainNodesRef.current.get(trackId);
      if (gainNode) {
        gainNode.gain.value = Math.max(0, Math.min(1, volume));
        
        supabase
          .from('tracks')
          .update({ volume })
          .eq('id', trackId)
          .then(({ error }) => {
            if (error) console.error('Error updating track volume:', error);
          });
      }
    },

    setTrackPan: (trackId: string, pan: number) => {
      const panNode = panNodesRef.current.get(trackId);
      if (panNode) {
        panNode.pan.value = Math.max(-1, Math.min(1, pan));
        
        supabase
          .from('tracks')
          .update({ pan })
          .eq('id', trackId)
          .then(({ error }) => {
            if (error) console.error('Error updating track pan:', error);
          });
      }
    },

    toggleTrackMute: (trackId: string) => {
      const gainNode = gainNodesRef.current.get(trackId);
      if (gainNode) {
        const isMuted = gainNode.gain.value === 0;
        gainNode.gain.value = isMuted ? 1.0 : 0;
        
        supabase
          .from('tracks')
          .update({ is_muted: !isMuted })
          .eq('id', trackId)
          .then(({ error }) => {
            if (error) console.error('Error updating track mute:', error);
          });
      }
    },

    toggleTrackSolo: (trackId: string) => {
      const wasSoloed = soloedTracksRef.current.has(trackId);
      
      if (wasSoloed) {
        soloedTracksRef.current.delete(trackId);
      } else {
        soloedTracksRef.current.add(trackId);
      }

      tracksRef.current.forEach((_, id) => {
        const gainNode = gainNodesRef.current.get(id);
        if (gainNode) {
          if (soloedTracksRef.current.size === 0) {
            gainNode.gain.value = 1.0;
          } else {
            gainNode.gain.value = soloedTracksRef.current.has(id) ? 1.0 : 0;
          }
        }
      });
    },

    reload: async () => {
      // Clean up existing tracks
      tracksRef.current.forEach((trackState) => {
        if (trackState.audio) {
          trackState.audio.pause();
          trackState.audio.src = '';
        }
      });
      tracksRef.current.clear();
      gainNodesRef.current.clear();
      panNodesRef.current.clear();
      
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Reload tracks
      await loadTracks();
    },
  };

  return [state, controls];
}