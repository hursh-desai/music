'use client';

import { useEffect, useRef, useState } from 'react';
import { useHandposeMediaPipe } from '@/lib/handposeMediaPipe';
import { initAudio, updateAudio, audioConfig, type AudioObjects, type AudioConfig } from '@/lib/audioConfig';
import { computeStringControls } from '@/lib/utils';
import StringCanvas from '@/components/StringCanvas';
import AudioConfigModal from '@/components/AudioConfigModal';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AudioConfig>(audioConfig);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const audioRef = useRef<AudioObjects | null>(null);
  const isPlayingRef = useRef(false);
  const previousTensionRef = useRef(0);
  const lastUpdateTimeRef = useRef(Date.now());
  const hands = useHandposeMediaPipe(videoRef);
  const [stringState, setStringState] = useState<{
    leftEnd: { x: number; y: number };
    rightEnd: { x: number; y: number };
    leftGrabbed: boolean;
    rightGrabbed: boolean;
  } | null>(null);

  // Suspend Tone.js context immediately after it loads to prevent autoplay errors
  useEffect(() => {
    const checkAndSuspendTone = () => {
      if (typeof window !== 'undefined' && window.Tone && window.Tone.context) {
        // Suspend the context if it's running to prevent autoplay errors
        if (window.Tone.context.state === 'running') {
          window.Tone.context.suspend().catch(() => {
            // Ignore errors if context is already suspended
          });
        }
      }
    };

    // Check immediately and also after a short delay to catch late loading
    checkAndSuspendTone();
    const timeoutId = setTimeout(checkAndSuspendTone, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  // Initialize webcam
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return;
    }

    const initWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsVideoReady(true);
          };
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          alert('Unable to access webcam. Please ensure permissions are granted.');
        }
      }
    };

    initWebcam();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        if (isPlayingRef.current) {
          audioRef.current.synth.triggerRelease();
        }
        audioRef.current.synth.dispose();
        audioRef.current.filter.dispose();
        if (audioRef.current.distortion) {
          audioRef.current.distortion.dispose();
        }
        if (audioRef.current.reverb) {
          audioRef.current.reverb.dispose();
        }
        if (audioRef.current.lfo) {
          audioRef.current.lfo.dispose();
        }
        if (audioRef.current.panNode) {
          audioRef.current.panNode.dispose();
        }
      }
    };
  }, []);

  // Initialize audio automatically when hands are detected
  useEffect(() => {
    const initializeAudio = async () => {
      // Only initialize if not already initialized and hands are detected
      if (audioInitialized || !isVideoReady) return;
      
      // Wait for hands to be detected (user interaction)
      if (!hands || hands.length === 0) return;

      try {
        if (typeof window !== 'undefined' && window.Tone) {
          // Ensure context is resumed (required for browser autoplay policy)
          if (window.Tone.context.state !== 'running') {
            await window.Tone.context.resume();
          }
          await window.Tone.start();
          const audio = initAudio(currentConfig);
          audioRef.current = audio;
          setAudioInitialized(true);
        }
      } catch (error) {
        // Silently handle audio initialization errors
      }
    };

    initializeAudio();
  }, [hands, isVideoReady, audioInitialized, currentConfig]);

  // Handle config changes - reinitialize audio system
  const handleConfigChange = (newConfig: AudioConfig) => {
    setCurrentConfig(newConfig);
    
    // Only reinitialize if audio is already initialized
    if (audioInitialized && audioRef.current) {
      // Stop any playing notes
      if (isPlayingRef.current) {
        audioRef.current.synth.triggerRelease();
        isPlayingRef.current = false;
      }
      
      // Dispose old audio objects
      audioRef.current.synth.dispose();
      audioRef.current.filter.dispose();
      if (audioRef.current.distortion) {
        audioRef.current.distortion.dispose();
      }
      if (audioRef.current.reverb) {
        audioRef.current.reverb.dispose();
      }
      if (audioRef.current.lfo) {
        audioRef.current.lfo.dispose();
      }
      if (audioRef.current.panNode) {
        audioRef.current.panNode.dispose();
      }
      
      // Initialize new audio with updated config
      try {
        const audio = initAudio(newConfig);
        audioRef.current = audio;
      } catch (error) {
        // Silently handle audio reinitialization errors
      }
    }
  };

  // Update audio based on string state from StringCanvas
  useEffect(() => {
    if (!audioInitialized || !audioRef.current || !stringState) {
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    // Calculate anchor points
    const midY = canvas.height / 2;
    const leftAnchor = { x: canvas.width * 0.25, y: midY };
    const rightAnchor = { x: canvas.width * 0.75, y: midY };

    // Use endpoints and grab state from StringCanvas
    const { leftEnd, rightEnd, leftGrabbed, rightGrabbed } = stringState;

    // Calculate delta time for velocity
    const now = Date.now();
    const deltaTime = (now - lastUpdateTimeRef.current) / 1000; // Convert to seconds
    lastUpdateTimeRef.current = now;

    // Compute enhanced controls
    const controls = computeStringControls(
      leftEnd,
      rightEnd,
      leftAnchor,
      rightAnchor,
      previousTensionRef.current,
      deltaTime,
      leftGrabbed,
      rightGrabbed
    );

    // Calculate midpoint X position for pitch mapping
    const midpointX = (leftEnd.x + rightEnd.x) / 2;

    // Update previous tension for next frame
    previousTensionRef.current = controls.tension;

    // Check if at least one side is grabbed (gate condition) - use actual grab state from StringCanvas
    const isGrabbed = leftGrabbed || rightGrabbed;

    // Pluck detection: check if velocity spike exceeds threshold
    const isPluck = Math.abs(controls.tensionVelocity) > currentConfig.mappings.pluckThreshold;

    // Update audio - only play if string is actually being pulled (grabbed)
    try {
      if (controls.tension > 0.01 && isGrabbed) {
        // Only play if there's meaningful tension and at least one side is grabbed
        if (!isPlayingRef.current) {
          try {
            audioRef.current.synth.triggerAttack('C4');
            isPlayingRef.current = true;
          } catch (error) {
            console.warn('Failed to trigger attack:', error);
          }
        }

        // If pluck detected, retrigger attack for percussive effect
        if (isPluck && controls.tensionVelocity > 0) {
          try {
            // Release current note before retriggering to avoid timing conflicts
            audioRef.current.synth.triggerRelease();
            // Schedule attack slightly in the future to ensure clean retrigger
            const Tone = window.Tone;
            const attackTime = Tone.now() + 0.01; // 10ms in the future
            audioRef.current.synth.triggerAttack('C4', attackTime);
          } catch (error) {
            console.warn('Failed to retrigger attack:', error);
          }
        }

        updateAudio(controls, audioRef.current, midpointX, canvas.width, currentConfig);
      } else {
        // Stop if no tension or not grabbed
        if (isPlayingRef.current) {
          try {
            audioRef.current.synth.triggerRelease();
            isPlayingRef.current = false;
          } catch (error) {
            console.warn('Failed to trigger release:', error);
          }
        }
      }
    } catch (error) {
      // Log error but don't crash the component
      console.error('Error in audio update loop:', error);
    }
  }, [stringState, audioInitialized, currentConfig]);

  return (
    <>
      {/* Floating Audio Settings Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 100,
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0051cc';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#0070f3';
        }}
        title="Audio Settings"
      >
        🎵
      </button>

      {/* Audio Config Modal */}
      <AudioConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={currentConfig}
        onConfigChange={handleConfigChange}
      />

      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <h1 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
          Handpose String Music
        </h1>

      <div style={{ position: 'relative', border: '2px solid #ddd', borderRadius: '8px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            display: isVideoReady ? 'block' : 'none',
            width: '800px',
            height: '600px',
            objectFit: 'cover',
            borderRadius: '8px',
            transform: 'scaleX(-1)',
          }}
        />
        {isVideoReady && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '800px',
              height: '600px',
              pointerEvents: 'none',
            }}
          >
            <StringCanvas 
              hands={hands} 
              video={videoRef.current} 
              width={800} 
              height={600}
              onStateChange={setStringState}
            />
          </div>
        )}
      </div>

      {isVideoReady && (
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          Move your hands to control the string. Left hand controls left side, right hand controls
          right side.
        </p>
      )}
      </main>
    </>
  );
}

