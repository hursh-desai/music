'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for handpose tracking
 * @param {React.RefObject<HTMLVideoElement>} videoRef - Reference to video element
 * @returns {Array} Array of hand landmarks
 */
export function useHandpose(videoRef) {
  const [hands, setHands] = useState([]);
  const handposeRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!videoRef.current || isInitializedRef.current) return;

    const video = videoRef.current;

    // Initialize handpose when video is ready
    const initHandpose = () => {
      if (typeof window === 'undefined' || !window.ml5) {
        console.warn('ml5.js not loaded yet');
        return;
      }

      // Check if handpose function exists
      if (!window.ml5.handpose) {
        console.error('ml5.handpose is not available. Make sure ml5.js v0.12.2 is loaded.');
        return;
      }

      try {
        // ml5.handpose (v0.12.2) - try to configure for multiple hands
        // MediaPipe Hands (which ml5 uses) supports maxNumHands option
        // Try passing it through even if ml5 doesn't officially document it
        const options = {
          flipHorizontal: false,
          // Try to pass maxNumHands to underlying MediaPipe model
          maxNumHands: 2,
        };
        
        console.log('Initializing handpose with options:', options);
        
        const handpose = window.ml5.handpose(
          video,
          options,
          () => {
            // Callback when model is ready
            console.log('Handpose model ready');
            // Try to access the underlying model to verify configuration
            if (handpose.model) {
              console.log('Handpose model object:', handpose.model);
            }
          }
        );

        handposeRef.current = handpose;

        // Listen for predictions
        handpose.on('predict', (results) => {
          // Debug: log number of hands detected and their details
          console.log(`Handpose prediction received: ${results ? results.length : 0} hand(s)`);
          if (results && results.length > 0) {
            console.log(`Detected ${results.length} hand(s)`);
            results.forEach((hand, index) => {
              const hasAnnotations = !!hand.annotations;
              const hasLandmarks = !!hand.landmarks;
              const handedness = hand.handedness || 'unknown';
              console.log(`  Hand ${index + 1}: handedness=${handedness}, annotations=${hasAnnotations}, landmarks=${hasLandmarks}`);
            });
          } else {
            console.log('No hands detected in this frame');
          }
          setHands(results || []);
        });

        isInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing handpose:', error);
      }
    };

    // Wait for both video metadata and ml5 to be ready
    const tryInitHandpose = () => {
      if (typeof window === 'undefined' || !window.ml5 || !window.ml5.handpose) {
        // Retry after a short delay if ml5 isn't ready yet
        setTimeout(tryInitHandpose, 100);
        return;
      }

      if (video.readyState >= 2) {
        initHandpose();
      } else {
        video.addEventListener('loadedmetadata', initHandpose, { once: true });
      }
    };

    tryInitHandpose();

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', initHandpose);
      if (handposeRef.current) {
        handposeRef.current.removeAllListeners();
      }
    };
  }, [videoRef]);

  return hands;
}

