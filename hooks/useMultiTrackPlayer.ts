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

  const loadTracks = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('post_id', projectId)
        .order('track_number', { ascending: true });

      if (error) {
        console.error('Error loading tracks:', error);
        setState(prev => ({ ...prev, error: 'Failed to load tracks' }));
        return;
      }

      if (!tracks || tracks.length === 0) {
        setState(prev => ({ ...prev, duration: 0 }));
        return;
      }

      // Filter out tracks without audio URLs
      const tracksWithAudio = tracks.filter(t => t.audio_url && t.audio_url.trim() !== '');
      
      if (tracksWithAudio.length === 0) {
        console.log('No tracks with audio to load');
        setState(prev => ({ ...prev, duration: 0, tracks: new Map() }));
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const newTracksMap = new Map<string, TrackState>();
      let maxDuration = 0;

      for (const track of tracksWithAudio) {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';

        const trackState: TrackState = {
          id: track.id,
          audio,
          isLoaded: false,
          error: null,
        };

        audio.addEventListener('loadedmetadata', () => {
          console.log(`Track ${track.id} loaded, duration:`, audio.duration);
          trackState.isLoaded = true;
          
          // Handle Infinity duration by using the database duration or a reasonable default
          let duration = audio.duration;
          if (!isFinite(duration)) {
            duration = track.duration || 0;
            console.log(`Using database duration for track ${track.id}:`, duration);
          }
          
          if (duration > maxDuration) {
            maxDuration = duration;
            setState(prev => ({ ...prev, duration: maxDuration }));
          }

          newTracksMap.set(track.id, { ...trackState });
          tracksRef.current = newTracksMap;
          setState(prev => ({ ...prev, tracks: new Map(newTracksMap) }));
        });

        audio.addEventListener('error', (e) => {
          console.error(`Error loading track ${track.id}:`, e);
          trackState.error = 'Failed to load audio';
          newTracksMap.set(track.id, { ...trackState });
          setState(prev => ({ ...prev, tracks: new Map(newTracksMap) }));
        });

        audio.addEventListener('canplay', () => {
          console.log(`Track ${track.id} can play`);
        });

        const audioContext = audioContextRef.current;
        const source = audioContext.createMediaElementSource(audio);
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = track.volume ?? 1.0;
        gainNodesRef.current.set(track.id, gainNode);

        const panNode = audioContext.createStereoPanner();
        panNode.pan.value = track.pan ?? 0;
        panNodesRef.current.set(track.id, panNode);

        source.connect(gainNode).connect(panNode).connect(audioContext.destination);

        audio.src = track.audio_url;
        audio.load();

        newTracksMap.set(track.id, trackState);
      }

      tracksRef.current = newTracksMap;
      setState(prev => ({ ...prev, tracks: new Map(newTracksMap) }));
    } catch (err) {
      console.error('Error in loadTracks:', err);
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Unknown error loading tracks' 
      }));
    }
  }, [projectId]);

  useEffect(() => {
    loadTracks();

    return () => {
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
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
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