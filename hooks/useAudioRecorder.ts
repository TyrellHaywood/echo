import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase';

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  error: string | null;
}

interface RecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
}

export function useAudioRecorder(): [RecorderState, RecorderControls] {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateRecordingTime = useCallback(() => {
    if (state.isRecording && !state.isPaused) {
      const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
      setState(prev => ({ ...prev, recordingTime: Math.floor(elapsed / 1000) }));
    }
  }, [state.isRecording, state.isPaused]);

  const controls: RecorderControls = {
    startRecording: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          } 
        });

        streamRef.current = stream;
        chunksRef.current = [];

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          setState(prev => ({ 
            ...prev, 
            error: 'Recording failed',
            isRecording: false 
          }));
        };

        startTimeRef.current = Date.now();
        pausedTimeRef.current = 0;
        
        mediaRecorder.start(100);

        setState({
          isRecording: true,
          isPaused: false,
          recordingTime: 0,
          error: null,
        });

        timerRef.current = setInterval(updateRecordingTime, 1000);
      } catch (err) {
        console.error('Error starting recording:', err);
        setState(prev => ({ 
          ...prev, 
          error: err instanceof Error ? err.message : 'Failed to access microphone',
          isRecording: false 
        }));
      }
    },

    stopRecording: async (): Promise<Blob | null> => {
      return new Promise((resolve) => {
        if (!mediaRecorderRef.current) {
          resolve(null);
          return;
        }

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          setState({
            isRecording: false,
            isPaused: false,
            recordingTime: 0,
            error: null,
          });

          chunksRef.current = [];
          resolve(blob);
        };

        mediaRecorderRef.current.stop();
      });
    },

    pauseRecording: () => {
      if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
        mediaRecorderRef.current.pause();
        pausedTimeRef.current = Date.now() - startTimeRef.current;
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setState(prev => ({ ...prev, isPaused: true }));
      }
    },

    resumeRecording: () => {
      if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
        mediaRecorderRef.current.resume();
        startTimeRef.current = Date.now() - pausedTimeRef.current;
        
        timerRef.current = setInterval(updateRecordingTime, 1000);
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
      
      setState({
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        error: null,
      });
    },
  };

  return [state, controls];
}

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