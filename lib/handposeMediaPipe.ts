'use client';

import { useEffect, useState, useRef } from 'react';
import { Hands } from '@mediapipe/hands';
import type { Hand } from '@/types/handpose';

/**
 * Custom hook for handpose tracking using MediaPipe Hands directly
 * This provides better multi-hand detection than ml5's wrapper
 */
export function useHandposeMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement>
): Hand[] {
  const [hands, setHands] = useState<Hand[]>([]);
  const handsRef = useRef<Hands | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const video = videoRef.current;
    if (!video || isInitializedRef.current) return;

    const initMediaPipeHands = async () => {
      if (isInitializedRef.current) return;

      try {
        const hands = new Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          // Convert MediaPipe results to ml5-like format for compatibility
          const convertedHands: Hand[] = results.multiHandLandmarks.map((landmarks, index) => {
            const handedness = results.multiHandedness[index];
            return {
              landmarks: landmarks.map((lm) => [lm.x, lm.y, lm.z] as [number, number, number]),
              handedness: handedness?.label || 'Unknown',
              // Create annotations-like structure for compatibility
              annotations: {
                thumb: landmarks.slice(1, 5).map(lm => [lm.x, lm.y] as [number, number]),
                indexFinger: landmarks.slice(5, 9).map(lm => [lm.x, lm.y] as [number, number]),
                middleFinger: landmarks.slice(9, 13).map(lm => [lm.x, lm.y] as [number, number]),
                ringFinger: landmarks.slice(13, 17).map(lm => [lm.x, lm.y] as [number, number]),
                pinky: landmarks.slice(17, 21).map(lm => [lm.x, lm.y] as [number, number]),
                palmBase: [[landmarks[0].x, landmarks[0].y] as [number, number]],
              },
            };
          });

          // Only update state if hands actually changed to prevent unnecessary re-renders
          setHands(prevHands => {
            if (prevHands.length !== convertedHands.length) {
              return convertedHands;
            }
            // Check if any hand data actually changed
            const hasChanged = prevHands.some((prevHand, idx) => {
              const newHand = convertedHands[idx];
              if (!newHand || prevHand.handedness !== newHand.handedness) {
                return true;
              }
              return prevHand.landmarks.some((lm, lmIdx) => {
                const newLm = newHand.landmarks[lmIdx];
                return !newLm || lm[0] !== newLm[0] || lm[1] !== newLm[1] || lm[2] !== newLm[2];
              });
            });
            return hasChanged ? convertedHands : prevHands;
          });
        });

        handsRef.current = hands;

        // Process video frames manually
        const processFrame = async () => {
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            await hands.send({ image: video });
          }
          animationFrameRef.current = requestAnimationFrame(processFrame);
        };

        // Start processing frames
        animationFrameRef.current = requestAnimationFrame(processFrame);
        isInitializedRef.current = true;
      } catch (error) {
        // Silently handle initialization errors
      }
    };

    // Wait for video to be ready
    if (video.readyState >= 2) {
      initMediaPipeHands();
    } else {
      video.addEventListener('loadedmetadata', initMediaPipeHands, { once: true });
    }

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', initMediaPipeHands);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      isInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return hands;
}

