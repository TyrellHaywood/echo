import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase';

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  error: string | null;
  permissionState: 'prompt' | 'granted' | 'denied' | 'checking' | null;
}

interface RecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  checkPermissions: () => Promise<boolean>;
}

// Helper function to check microphone permissions
async function checkMicrophonePermission(): Promise<PermissionState | null> {
  try {
    // Check if Permissions API is available
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    }
    return null;
  } catch (err) {
    console.warn('Permissions API not available or microphone permission check failed:', err);
    return null;
  }
}

// Helper function with timeout wrapper for getUserMedia
function getUserMediaWithTimeout(
  constraints: MediaStreamConstraints,
  timeoutMs: number = 10000
): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Microphone access request timed out. Please check your browser permissions.'));
    }, timeoutMs);

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        clearTimeout(timeoutId);
        resolve(stream);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

export function useAudioRecorder(): [RecorderState, RecorderControls] {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    error: null,
    permissionState: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  const updateRecordingTime = useCallback(() => {
    if (isRecordingRef.current && !isPausedRef.current) {
      const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
      setState(prev => ({ ...prev, recordingTime: Math.floor(elapsed / 1000) }));
    }
  }, []);

  const controls: RecorderControls = {
    checkPermissions: async (): Promise<boolean> => {
      setState(prev => ({ ...prev, permissionState: 'checking' }));
      
      const permissionState = await checkMicrophonePermission();
      
      if (permissionState) {
        setState(prev => ({ ...prev, permissionState }));
        return permissionState === 'granted';
      }
      
      // If Permissions API not available, assume we need to request
      setState(prev => ({ ...prev, permissionState: 'prompt' }));
      return false;
    },

    startRecording: async () => {
      console.log('startRecording function called');
      
      // Check if running in secure context (HTTPS or localhost)
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        const error = 'Recording requires a secure context (HTTPS). Please use HTTPS or localhost.';
        console.error(error);
        setState(prev => ({ 
          ...prev, 
          error,
          isRecording: false,
          permissionState: 'denied'
        }));
        return;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const error = 'Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.';
        console.error(error);
        setState(prev => ({ 
          ...prev, 
          error,
          isRecording: false,
          permissionState: 'denied'
        }));
        return;
      }

      try {
        // Check permission state first
        console.log('Checking microphone permissions...');
        setState(prev => ({ ...prev, permissionState: 'checking', error: null }));
        
        const permissionState = await checkMicrophonePermission();
        console.log('Permission state:', permissionState);
        
        if (permissionState === 'denied') {
          const error = 'Microphone access denied. Please enable microphone permissions in your browser settings.';
          console.error(error);
          setState(prev => ({ 
            ...prev, 
            error,
            isRecording: false,
            permissionState: 'denied'
          }));
          return;
        }

        console.log('Requesting microphone access...');
        setState(prev => ({ ...prev, permissionState: 'prompt' }));
        
        // Request microphone access with timeout
        const stream = await getUserMediaWithTimeout({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          } 
        }, 10000); // 10 second timeout

        console.log('Microphone access granted');
        console.log('Stream active:', stream.active);
        console.log('Audio tracks:', stream.getAudioTracks().length);

        streamRef.current = stream;
        chunksRef.current = [];

        // Determine best supported MIME type
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.warn('audio/webm;codecs=opus not supported, trying audio/webm');
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            console.warn('audio/webm not supported, trying audio/mp4');
            mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              console.warn('audio/mp4 not supported, using default');
              mimeType = '';
            }
          }
        }

        console.log('Using MIME type:', mimeType || 'default');

        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        console.log('MediaRecorder created, state:', mediaRecorder.state);

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstart = () => {
          console.log('MediaRecorder started');
        };

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          setState(prev => ({ 
            ...prev, 
            error: 'Recording failed. Please try again.',
            isRecording: false,
            permissionState: 'denied'
          }));
          isRecordingRef.current = false;
        };

        startTimeRef.current = Date.now();
        pausedTimeRef.current = 0;
        
        mediaRecorder.start(100); // Collect data every 100ms

        isRecordingRef.current = true;
        isPausedRef.current = false;

        setState({
          isRecording: true,
          isPaused: false,
          recordingTime: 0,
          error: null,
          permissionState: 'granted',
        });

        timerRef.current = window.setInterval(updateRecordingTime, 1000);
        console.log('Recording started successfully');
        
      } catch (err) {
        console.error('Error starting recording:', err);
        
        let errorMessage = 'Failed to access microphone. ';
        
        if (err instanceof Error) {
          console.error('Error name:', err.name);
          console.error('Error message:', err.message);
          
          // Provide specific error messages based on error type
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMessage = 'Microphone is already in use by another application.';
          } else if (err.name === 'OverconstrainedError') {
            errorMessage = 'Microphone does not meet the required constraints.';
          } else if (err.name === 'SecurityError') {
            errorMessage = 'Recording requires a secure connection (HTTPS).';
          } else if (err.message.includes('timeout')) {
            errorMessage = err.message;
          } else {
            errorMessage += err.message;
          }
        }
        
        setState(prev => ({ 
          ...prev, 
          error: errorMessage,
          isRecording: false,
          permissionState: 'denied'
        }));
        isRecordingRef.current = false;
      }
    },

    stopRecording: async (): Promise<Blob | null> => {
      console.log('stopRecording called');
      return new Promise((resolve) => {
        if (!mediaRecorderRef.current) {
          console.log('No mediaRecorder instance');
          resolve(null);
          return;
        }

        console.log('MediaRecorder state before stop:', mediaRecorderRef.current.state);

        mediaRecorderRef.current.onstop = () => {
          console.log('MediaRecorder stopped, chunks collected:', chunksRef.current.length);
          
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          console.log('Blob created, size:', blob.size);
          
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
              track.stop();
            });
            streamRef.current = null;
          }

          // Clear timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          isRecordingRef.current = false;
          isPausedRef.current = false;

          setState({
            isRecording: false,
            isPaused: false,
            recordingTime: 0,
            error: null,
            permissionState: 'granted',
          });

          chunksRef.current = [];
          resolve(blob);
        };

        mediaRecorderRef.current.stop();
      });
    },

    pauseRecording: () => {
      if (mediaRecorderRef.current && isRecordingRef.current && !isPausedRef.current) {
        mediaRecorderRef.current.pause();
        pausedTimeRef.current = Date.now() - startTimeRef.current;
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        isPausedRef.current = true;
        setState(prev => ({ ...prev, isPaused: true }));
      }
    },

    resumeRecording: () => {
      if (mediaRecorderRef.current && isRecordingRef.current && isPausedRef.current) {
        mediaRecorderRef.current.resume();
        startTimeRef.current = Date.now() - pausedTimeRef.current;
        
        timerRef.current = window.setInterval(updateRecordingTime, 1000);
        isPausedRef.current = false;
        setState(prev => ({ ...prev, isPaused: false }));
      }
    },

    cancelRecording: () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      chunksRef.current = [];
      isRecordingRef.current = false;
      isPausedRef.current = false;
      
      setState({
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        error: null,
        permissionState: null,
      });
    },
  };

  return [state, controls];
}

// Upload recording helper function
export async function uploadRecording(
  blob: Blob,
  projectId: string,
  trackNumber: number,
  userId: string
): Promise<{ audioUrl: string; duration: number } | null> {
  try {
    const timestamp = Date.now();
    const filename = `${projectId}/${timestamp}_track_${trackNumber}.webm`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(filename, blob, {
        contentType: 'audio/webm',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading audio:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('audio')
      .getPublicUrl(uploadData.path);

    const duration = await getAudioDuration(blob);

    return {
      audioUrl: urlData.publicUrl,
      duration: Math.floor(duration),
    };
  } catch (err) {
    console.error('Error in uploadRecording:', err);
    return null;
  }
}

// Get audio duration helper function
function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });

    audio.src = url;
  });
}

// Create track in database helper function
export async function createTrackInDatabase(
  projectId: string,
  trackNumber: number,
  audioUrl: string,
  duration: number,
  userId: string,
  title?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .insert({
        post_id: projectId,
        user_id: userId,
        track_number: trackNumber,
        title: title || `Track ${trackNumber}`,
        audio_url: audioUrl,
        duration,
        volume: 1.0,
        pan: 0.0,
        is_muted: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating track:', error);
      return null;
    }

    await supabase
      .from('posts')
      .update({ track_count: trackNumber })
      .eq('id', projectId);

    return data.id;
  } catch (err) {
    console.error('Error in createTrackInDatabase:', err);
    return null;
  }
}