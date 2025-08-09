import { useState, useEffect, useRef } from 'react';
import React from 'react';

export type AudioPlayerState = {
  isPlaying: boolean;
  isLoaded: boolean;
  duration: number;
  currentTime: number;
  error: string | null;
};

export type AudioControls = {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  retry: () => void;
  formatTime: (time: number) => string;
};

/**
 * Check if the browser supports a specific audio format
 */
function canPlayType(type: string): boolean {
  if (typeof window === 'undefined') return false;
  const audio = document.createElement('audio');
  return !!audio.canPlayType && audio.canPlayType(type) !== '';
}

/**
 * Get MIME type from file extension or URL
 */
export function getAudioMimeType(url: string): string | null {
  const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
  
  switch (extension) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    case 'aac':
      return 'audio/aac';
    case 'flac':
      return 'audio/flac';
    default:
      return null;
  }
}

/**
 * Check if the browser can play a specific audio file
 */
export function canPlayAudio(url: string): boolean {
  const mimeType = getAudioMimeType(url);
  if (!mimeType) return true; // If we can't determine the type, assume it's playable
  return canPlayType(mimeType);
}

/**
 * Creates a signed URL for a Supabase storage file
 * @param url Original file URL
 * @param supabase Supabase client instance
 * @returns Promise with signed URL or original URL if signing fails
 */
export async function createSignedAudioUrl(url: string, supabase: any): Promise<string> {
  if (!url.includes('supabase.co')) {
    return url;
  }

  try {
    // Better parsing of bucket and path from public URLs
    if (url.includes('/object/public/')) {
      const publicUrlRegex = /\/object\/public\/([^/]+)\/(.+)(?:\?.*)?$/;
      const match = url.match(publicUrlRegex);
      
      if (match && match.length >= 3) {
        const bucket = match[1];
        const path = match[2].split('?')[0]; // Remove any query parameters
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600);
          
        if (error) {
          console.error("Error creating signed URL:", error);
          // Try with download=true parameter
          return addDownloadParam(url);
        }
        
        if (data?.signedUrl) {
          return data.signedUrl;
        }
      }
    }
    
    // If we couldn't parse or create a signed URL, try making it publicly accessible
    return addDownloadParam(url);
  } catch (err) {
    console.error("Error generating signed URL:", err);
    return addDownloadParam(url);
  }
}

// Helper function to add download parameter
function addDownloadParam(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}download=`;
}

/**
 * Hook to manage audio playback
 * @param url Audio URL
 * @returns Audio state and controls
 */
export function useAudioPlayer(
  url: string | null, 
  options: { autoPlay?: boolean } = {}
): [AudioPlayerState, AudioControls] {
  // State
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoaded: false,
    duration: 0,
    currentTime: 0,
    error: null,
  });
  
  // Add a ref to track if we should attempt auto-play
  const shouldAutoPlay = useRef(options.autoPlay || false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(url);

  // Setup audio player when URL changes
  useEffect(() => {
    audioUrlRef.current = url;
    
    // Clean up function
    const cleanupAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current = null;
      }
    };

    if (!url) {
      setState(prev => ({ ...prev, error: null, isLoaded: false }));
      return cleanupAudio;
    }

    // Check if format is supported before trying to play
    const mimeType = getAudioMimeType(url);
    if (mimeType && !canPlayType(mimeType)) {
      setState(prev => ({
        ...prev, 
        error: `Your browser doesn't support ${mimeType} audio format.`,
        isLoaded: false
      }));
      console.warn(`Browser doesn't support format: ${mimeType}`);
      return cleanupAudio;
    }

    // Clean up previous instance
    cleanupAudio();

    try {
      
      // Create new audio element with explicit type if available
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      
      // Add preload attribute for better performance
      audio.preload = "metadata";
      
      // Reset state
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoaded: false,
        currentTime: 0,
        error: null
      }));

      // Setup event listeners
      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        if (audio.error) {
          console.error(`Error code: ${audio.error.code}, message: ${audio.error.message}`);
          console.error(`Network state: ${audio.networkState}, ready state: ${audio.readyState}`);
          
          let errorMsg = 'Unknown audio error';
          
          // Better error messages based on error code
          switch(audio.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMsg = 'Playback aborted by the user';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMsg = 'Network error while loading audio';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMsg = 'Audio format not supported by your browser';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMsg = 'Audio format not supported or file not found';
              break;
          }
          
          setState(prev => ({
            ...prev,
            isPlaying: false,
            isLoaded: false,
            error: errorMsg,
          }));
        }
      });

      // Additional events for better user experience
      audio.addEventListener('waiting', () => {
      });
      
      audio.addEventListener('canplaythrough', () => {
      });

      audio.addEventListener('loadedmetadata', () => {
        setState(prev => ({
          ...prev,
          isLoaded: true,
          duration: audio.duration || 0,
        }));
      });

      audio.addEventListener('timeupdate', () => {
        setState(prev => ({
          ...prev,
          currentTime: audio.currentTime,
        }));
      });

      audio.addEventListener('ended', () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          currentTime: 0,
        }));
      });

    audio.addEventListener('loadedmetadata', () => {
        setState(prev => ({
        ...prev,
        isLoaded: true,
        duration: audio.duration || 0,
        }));
        
        // Try to auto-play if requested
        if (shouldAutoPlay.current) {
        audio.play().catch(err => {
            console.warn('Auto-play prevented by browser:', err);
            setState(prev => ({
            ...prev,
            isPlaying: false
            }));
        });
        }
    });

      // Set source and start loading
      audioRef.current = audio;
      audio.src = url;
      audio.load();

      return cleanupAudio;
    } catch (err) {
      console.error('Error setting up audio:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error setting up audio',
      }));
      return cleanupAudio;
    }
  }, [url]);

  // Handle play/pause state
  useEffect(() => {
    if (!audioRef.current || !state.isLoaded) return;

    if (state.isPlaying) {
      audioRef.current.play().catch(err => {
        console.error('Playback error:', err);
        setState(prev => ({
          ...prev,
          isPlaying: false,
          error: `Playback error: ${err.message || 'Unknown error'}`,
        }));
      });
    } else {
      audioRef.current.pause();
    }
  }, [state.isPlaying, state.isLoaded]);

  // Control functions
  const controls: AudioControls = {
    play: async () => {
      if (!audioRef.current || !state.isLoaded) return;
      
      try {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      } catch (err) {
        console.error('Play error:', err);
        setState(prev => ({ 
          ...prev, 
          error: err instanceof Error ? err.message : 'Unknown playback error' 
        }));
      }
    },
    
    pause: () => {
      if (!audioRef.current) return;
      
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    },
    
    seek: (time: number) => {
      if (!audioRef.current || !state.isLoaded) return;
      
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    },
    
    retry: () => {
      // Reset error state and try again with the URL
      setState(prev => ({ ...prev, error: null }));
      
      // If we have a URL, create new audio instance with it
      if (audioUrlRef.current) {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = audioUrlRef.current;
        audioRef.current = audio;
        audio.load();
        
        setState(prev => ({ ...prev, isLoaded: false }));
      }
    },
    
    formatTime: (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    },
  };

  return [state, controls];
}

/**
 * Simple component to render HTML5 audio element
 */
export const NativeAudioPlayer = ({ 
  url, 
  className = "" 
}: { 
  url: string | null;
  className?: string;
}) => {
  if (!url) return null;
  
  return React.createElement('audio', {
    controls: true,
    src: url,
    className,
    crossOrigin: "anonymous",
    style: { width: '100%' },
    preload: "metadata"
  }, "Your browser does not support the audio element.");
};