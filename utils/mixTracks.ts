import { supabase } from './supabase';

export interface Track {
  id: string;
  audio_url: string;
  volume: number;
  pan: number;
  is_muted: boolean;
  duration: number;
}

/**
 * Mix multiple tracks into a single audio file
 * @param tracks Array of track objects with audio URLs and settings
 * @returns Blob containing the mixed WAV audio
 */
export async function mixTracks(tracks: Track[]): Promise<Blob> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    // Filter out muted tracks
    const activeTracks = tracks.filter(track => !track.is_muted && track.audio_url);
    
    if (activeTracks.length === 0) {
      throw new Error('No active tracks to mix');
    }

    // Load all track audio buffers
    const audioBuffers = await Promise.all(
      activeTracks.map(async (track) => {
        const response = await fetch(track.audio_url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return { track, buffer: audioBuffer };
      })
    );

    // Find the maximum duration and sample rate
    const maxDuration = Math.max(...audioBuffers.map(ab => ab.buffer.duration));
    const sampleRate = audioContext.sampleRate;
    const maxLength = Math.ceil(maxDuration * sampleRate);
    
    // Determine number of channels (stereo if any track has pan or is stereo)
    const numberOfChannels = audioBuffers.some(
      ab => ab.buffer.numberOfChannels > 1 || ab.track.pan !== 0
    ) ? 2 : 1;

    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(
      numberOfChannels,
      maxLength,
      sampleRate
    );

    // Create source nodes and apply effects for each track
    audioBuffers.forEach(({ track, buffer }) => {
      const source = offlineContext.createBufferSource();
      source.buffer = buffer;

      // Create gain node for volume
      const gainNode = offlineContext.createGain();
      gainNode.gain.value = track.volume;

      // Create panner for stereo positioning (if stereo output)
      if (numberOfChannels === 2 && track.pan !== 0) {
        const panNode = offlineContext.createStereoPanner();
        panNode.pan.value = track.pan;
        source.connect(gainNode).connect(panNode).connect(offlineContext.destination);
      } else {
        source.connect(gainNode).connect(offlineContext.destination);
      }

      source.start(0);
    });

    // Render the mixed audio
    const renderedBuffer = await offlineContext.startRendering();

    // Convert to WAV blob
    const wavBlob = await audioBufferToWav(renderedBuffer);
    
    return wavBlob;
  } finally {
    audioContext.close();
  }
}

/**
 * Convert AudioBuffer to WAV Blob
 */
async function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;

  // Create WAV file buffer
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);

  // Write WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true); // ByteRate
  view.setUint16(32, numberOfChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}