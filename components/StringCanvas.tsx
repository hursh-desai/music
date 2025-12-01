'use client';

import { useEffect, useRef } from 'react';
import type { Hand } from '@/types/handpose';

interface StringCanvasProps {
  hands?: Hand[];
  video: HTMLVideoElement | null;
  width?: number;
  height?: number;
  onStateChange?: (state: {
    leftEnd: Point;
    rightEnd: Point;
    leftGrabbed: boolean;
    rightGrabbed: boolean;
  }) => void;
}

interface Point {
  x: number;
  y: number;
}

interface HandTip extends Point {
  handId: number;
  isPinched: boolean;
}

interface PinchState {
  state: boolean;
  releaseTime: number | null;
}

interface CanvasState {
  leftEnd: Point | null;
  rightEnd: Point | null;
  leftGrabbed: boolean;
  rightGrabbed: boolean;
  leftHandId: number | null;
  rightHandId: number | null;
  pinchStates: Record<number, PinchState>;
}

export default function StringCanvas({ hands = [], video, width = 800, height = 600, onStateChange }: StringCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Constants for grab/release behavior
  const GRAB_RADIUS = 30;
  const RELEASE_HYSTERESIS = 10;
  const EASING_FACTOR = 0.15;
  const PINCH_THRESHOLD = 50; // Distance in pixels between thumb and index finger tips for grabbing
  const PINCH_RELEASE_THRESHOLD = 80; // Larger threshold for releasing (hysteresis)
  const PINCH_DEBOUNCE_TIME = 150; // Milliseconds to wait before releasing after pinch stops

  // Stateful endpoint tracking
  const stateRef = useRef<CanvasState>({
    leftEnd: null,
    rightEnd: null,
    leftGrabbed: false,
    rightGrabbed: false,
    leftHandId: null,
    rightHandId: null,
    // Track pinch state per handId (for hysteresis and debouncing)
    pinchStates: {}, // Map of handId -> { state: boolean, releaseTime: number | null }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Anchor points (rest position)
    const midY = canvas.height / 2;
    const leftAnchor: Point = { x: canvas.width * 0.25, y: midY };
    const rightAnchor: Point = { x: canvas.width * 0.75, y: midY };

    // Initialize endpoints at anchors if not set
    if (!stateRef.current.leftEnd) {
      stateRef.current.leftEnd = { ...leftAnchor };
    }
    if (!stateRef.current.rightEnd) {
      stateRef.current.rightEnd = { ...rightAnchor };
    }

    // Helper function for coordinate mapping
    // ml5 handpose typically returns normalized coordinates (0-1) for MediaPipe-based models
    const videoToCanvas = (vx: number, vy: number, video: HTMLVideoElement | null, canvas: HTMLCanvasElement): [number, number] => {
      if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
        return [vx, vy];
      }
      
      // ml5 handpose returns normalized coordinates (0-1), convert to pixels first
      // But also handle pixel coordinates if that's what we get
      let pixelX: number, pixelY: number;
      
      // If values are > 1, assume pixel coordinates; otherwise assume normalized
      if (vx > 1 || vy > 1) {
        // Pixel coordinates: flip by subtracting from video width
        pixelX = video.videoWidth - vx;
        pixelY = vy;
      } else {
        // Normalized coordinates: flip by subtracting from 1, then convert to pixels
        pixelX = (1 - vx) * video.videoWidth;
        pixelY = vy * video.videoHeight;
      }
      
      // Scale to canvas size
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;
      return [pixelX * scaleX, pixelY * scaleY];
    };

    // Helper function to clamp coordinates to canvas bounds
    const clampToCanvas = (x: number, y: number, canvas: HTMLCanvasElement): [number, number] => {
      return [
        Math.max(0, Math.min(canvas.width, x)),
        Math.max(0, Math.min(canvas.height, y))
      ];
    };

    // Helper function to check if a point is out of bounds
    const isOutOfBounds = (x: number, y: number, canvas: HTMLCanvasElement): boolean => {
      return x < 0 || x > canvas.width || y < 0 || y > canvas.height;
    };

    // Helper function to detect pinch gesture with hysteresis
    // Returns true if pinching, false if not pinching
    // Uses different thresholds for grabbing vs releasing to prevent flicker
    const getPinchState = (hand: Hand, video: HTMLVideoElement | null, canvas: HTMLCanvasElement, currentState: boolean): boolean => {
      if (!hand || !video || !canvas) return false;

      let thumbTip: [number, number] | Point | null = null;
      let indexTip: [number, number] | Point | null = null;

      // Try landmarks format first (MediaPipe format)
      if (hand.landmarks && Array.isArray(hand.landmarks)) {
        // Landmark 4 is thumb tip, landmark 8 is index finger tip
        if (hand.landmarks[4] && hand.landmarks[8]) {
          // Extract only x and y coordinates (first two elements)
          thumbTip = [hand.landmarks[4][0], hand.landmarks[4][1]] as [number, number];
          indexTip = [hand.landmarks[8][0], hand.landmarks[8][1]] as [number, number];
        }
      }
      // Try annotations format (ml5 format)
      else if (hand.annotations) {
        // Thumb tip is last element of thumb array (index 3), index tip is last element of indexFinger array (index 3)
        if (hand.annotations.thumb && hand.annotations.thumb[3] && 
            hand.annotations.indexFinger && hand.annotations.indexFinger[3]) {
          thumbTip = hand.annotations.thumb[3];
          indexTip = hand.annotations.indexFinger[3];
        }
      }

      if (!thumbTip || !indexTip) return false;

      // Convert to canvas coordinates
      const [vx1, vy1] = Array.isArray(thumbTip) ? thumbTip : [thumbTip.x, thumbTip.y];
      const [vx2, vy2] = Array.isArray(indexTip) ? indexTip : [indexTip.x, indexTip.y];
      
      const [x1, y1] = videoToCanvas(vx1, vy1, video, canvas);
      const [x2, y2] = videoToCanvas(vx2, vy2, video, canvas);

      // Calculate distance between thumb and index finger tips
      const pinchDistance = Math.hypot(x2 - x1, y2 - y1);
      
      // Hysteresis: use different thresholds based on current state
      if (currentState) {
        // Currently pinching: require larger distance to release
        return pinchDistance < PINCH_RELEASE_THRESHOLD;
      } else {
        // Not currently pinching: require smaller distance to grab
        return pinchDistance < PINCH_THRESHOLD;
      }
    };

    // Draw hand skeleton/landmarks
    const drawHandSkeleton = (hand: Hand, ctx: CanvasRenderingContext2D, video: HTMLVideoElement | null, canvas: HTMLCanvasElement): void => {
      // ml5 handpose can return data in different formats depending on version
      // Try both 'annotations' (older) and 'landmarks' (newer) formats
      const annotations = hand.annotations || null;
      
      // If no annotations, try to draw from raw landmarks array (ml5 v1.0+ format)
      if (!annotations && hand.landmarks && Array.isArray(hand.landmarks)) {
        // Draw all landmarks as points with connections
        const landmarks = hand.landmarks;
        
        // Hand landmark connections (MediaPipe hand pose connections)
        const connections: Array<[number, number]> = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [0, 9], [9, 10], [10, 11], [11, 12], // Middle
          [0, 13], [13, 14], [14, 15], [15, 16], // Ring
          [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
          [5, 9], [9, 13], [13, 17], [17, 5], // Palm connections
        ];
        
        // Draw connections
        ctx.strokeStyle = '#4ECDC4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        connections.forEach(([start, end]) => {
          if (landmarks[start] && landmarks[end]) {
            const [vx1, vy1] = landmarks[start];
            const [vx2, vy2] = landmarks[end];
            let [x1, y1] = videoToCanvas(vx1, vy1, video, canvas);
            let [x2, y2] = videoToCanvas(vx2, vy2, video, canvas);
            
            // Skip drawing if either endpoint is out of bounds
            if (isOutOfBounds(x1, y1, canvas) || isOutOfBounds(x2, y2, canvas)) {
              return;
            }
            
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
        });
        ctx.stroke();
        
        // Draw landmarks as points
        landmarks.forEach((landmark) => {
          const [vx, vy] = landmark;
          const [x, y] = videoToCanvas(vx, vy, video, canvas);
          // Skip drawing if landmark is out of bounds
          if (isOutOfBounds(x, y, canvas)) {
            return;
          }
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#4ECDC4';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        return;
      }
      
      if (!annotations) {
        return;
      }

      const colors = {
        thumb: '#FF6B6B',
        indexFinger: '#4ECDC4',
        middleFinger: '#45B7D1',
        ringFinger: '#96CEB4',
        pinky: '#FFEAA7',
        palm: '#DDA15E',
      };

      // Draw connections between landmarks
      const drawConnections = (points: Array<[number, number] | Point>, color: string): void => {
        if (!points || points.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3; // Make lines thicker for visibility
        ctx.beginPath();
        for (let i = 0; i < points.length - 1; i++) {
          const point1 = points[i];
          const point2 = points[i + 1];
          
          // Handle both [x, y] and {x, y} formats
          const [vx1, vy1] = Array.isArray(point1) ? point1 : [point1.x, point1.y];
          const [vx2, vy2] = Array.isArray(point2) ? point2 : [point2.x, point2.y];
          
          let [x1, y1] = videoToCanvas(vx1, vy1, video, canvas);
          let [x2, y2] = videoToCanvas(vx2, vy2, video, canvas);
          
          // Skip drawing if either endpoint is out of bounds
          if (isOutOfBounds(x1, y1, canvas) || isOutOfBounds(x2, y2, canvas)) {
            continue;
          }
          
          if (i === 0) {
            ctx.moveTo(x1, y1);
          }
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      };

      // Draw each finger
      if (annotations.thumb) drawConnections(annotations.thumb, colors.thumb);
      if (annotations.indexFinger) drawConnections(annotations.indexFinger, colors.indexFinger);
      if (annotations.middleFinger) drawConnections(annotations.middleFinger, colors.middleFinger);
      if (annotations.ringFinger) drawConnections(annotations.ringFinger, colors.ringFinger);
      if (annotations.pinky) drawConnections(annotations.pinky, colors.pinky);

      // Draw palm base connections
      if (annotations.palmBase && annotations.indexFinger?.[0]) {
        const palmBase = annotations.palmBase[0];
        const indexBase = annotations.indexFinger[0];
        const [vx1, vy1] = Array.isArray(palmBase) ? palmBase : [palmBase.x, palmBase.y];
        const [vx2, vy2] = Array.isArray(indexBase) ? indexBase : [indexBase.x, indexBase.y];
        let [x1, y1] = videoToCanvas(vx1, vy1, video, canvas);
        let [x2, y2] = videoToCanvas(vx2, vy2, video, canvas);
        
        // Skip drawing if either endpoint is out of bounds
        if (!isOutOfBounds(x1, y1, canvas) && !isOutOfBounds(x2, y2, canvas)) {
          ctx.strokeStyle = colors.palm;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // Draw landmarks as circles (make them bigger for visibility)
      const drawLandmarks = (points: Array<[number, number] | Point>, color: string): void => {
        if (!points) return;
        points.forEach((point) => {
          const [vx, vy] = Array.isArray(point) ? point : [point.x, point.y];
          const [x, y] = videoToCanvas(vx, vy, video, canvas);
          // Skip drawing if landmark is out of bounds
          if (isOutOfBounds(x, y, canvas)) {
            return;
          }
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2); // Increased from 3 to 5
          ctx.fillStyle = color;
          ctx.fill();
          // Add white outline for better visibility
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      };

      if (annotations.thumb) drawLandmarks(annotations.thumb, colors.thumb);
      if (annotations.indexFinger) drawLandmarks(annotations.indexFinger, colors.indexFinger);
      if (annotations.middleFinger) drawLandmarks(annotations.middleFinger, colors.middleFinger);
      if (annotations.ringFinger) drawLandmarks(annotations.ringFinger, colors.ringFinger);
      if (annotations.pinky) drawLandmarks(annotations.pinky, colors.pinky);
      if (annotations.palmBase && annotations.palmBase[0]) {
        const palmBase = annotations.palmBase[0];
        const [vx, vy] = Array.isArray(palmBase) ? palmBase : [palmBase.x, palmBase.y];
        const [x, y] = videoToCanvas(vx, vy, video, canvas);
        // Skip drawing if landmark is out of bounds
        if (!isOutOfBounds(x, y, canvas)) {
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2); // Increased from 5 to 7
          ctx.fillStyle = colors.palm;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    };

    // Helper function to calculate distance between two points
    const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

    // Helper function for linear interpolation (easing)
    const lerp = (start: Point, end: Point, factor: number): Point => ({
      x: start.x + (end.x - start.x) * factor,
      y: start.y + (end.y - start.y) * factor,
    });

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const state = stateRef.current;
      let leftHandTip: HandTip | null = null;
      let rightHandTip: HandTip | null = null;
      const activeHandIds = new Set<number>();

      // Collect all hand tips with their positions, IDs, and pinch states
      const handTips: HandTip[] = [];
      const currentTime = Date.now();
      
      if (hands && hands.length > 0 && video) {
        hands.forEach((hand, index) => {
          // Draw full hand skeleton
          drawHandSkeleton(hand, ctx, video, canvas);

          // Use index finger tip for string control
          // Try annotations format first (ml5 < 1.0), then landmarks format (ml5 >= 1.0)
          let tip: [number, number] | Point | null = null;
          if (hand.annotations?.indexFinger?.[3]) {
            tip = hand.annotations.indexFinger[3];
          } else if (hand.landmarks && Array.isArray(hand.landmarks) && hand.landmarks[8]) {
            // Landmark 8 is index finger tip in MediaPipe format
            // Extract only x and y coordinates (first two elements)
            tip = [hand.landmarks[8][0], hand.landmarks[8][1]] as [number, number];
          }
          
          if (tip && stateRef.current.leftEnd && stateRef.current.rightEnd) {
            const [vx, vy] = Array.isArray(tip) ? tip : [tip.x, tip.y];
            const [x, y] = videoToCanvas(vx, vy, video, canvas);
            const handId = index; // Use index as hand ID
            
            // Initialize pinch state tracking for this hand if needed
            if (!state.pinchStates[handId]) {
              state.pinchStates[handId] = { state: false, releaseTime: null };
            }
            
            const pinchData = state.pinchStates[handId];
            const currentPinchState = pinchData.state;
            
            // Update pinch state with hysteresis
            const rawPinchState = getPinchState(hand, video, canvas, currentPinchState);
            
            // Update pinch state tracking
            if (!rawPinchState && currentPinchState) {
              // Pinch was just released - start debounce timer
              if (pinchData.releaseTime === null) {
                pinchData.releaseTime = currentTime;
              }
            } else if (rawPinchState) {
              // Pinch is active - clear debounce timer
              pinchData.releaseTime = null;
            }
            
            // Update the state (with hysteresis applied)
            pinchData.state = rawPinchState;
            
            // Apply debouncing: only consider pinched if either:
            // 1. Raw state is pinched, OR
            // 2. We're currently grabbed and within debounce window
            let isPinched = rawPinchState;
            const isControllingEndpoint = (state.leftHandId === handId && state.leftGrabbed) ||
                                         (state.rightHandId === handId && state.rightGrabbed);
            
            if (!rawPinchState && isControllingEndpoint) {
              // Check if still within debounce window
              if (pinchData.releaseTime !== null && 
                  (currentTime - pinchData.releaseTime) < PINCH_DEBOUNCE_TIME) {
                isPinched = true; // Keep pinched during debounce
              }
            }
            
            handTips.push({ x, y, handId, isPinched });
            activeHandIds.add(handId);
          }
        });
      }

      // Clean up pinch state for hands that are no longer present
      Object.keys(state.pinchStates).forEach(handId => {
        if (!activeHandIds.has(parseInt(handId))) {
          delete state.pinchStates[parseInt(handId)];
        }
      });
      
      // Check if previously controlling hands are still present
      if (state.leftHandId !== null && !activeHandIds.has(state.leftHandId)) {
        state.leftGrabbed = false;
        state.leftHandId = null;
      }
      if (state.rightHandId !== null && !activeHandIds.has(state.rightHandId)) {
        state.rightGrabbed = false;
        state.rightHandId = null;
      }

      // Process grab/release logic for left endpoint
      if (handTips.length > 0 && state.leftEnd) {
        // Find closest hand tip to left endpoint
        let closestToLeft: HandTip | null = null;
        let minDistToLeft = Infinity;
        
        handTips.forEach((tip) => {
          const dist = distance(tip, state.leftEnd!);
          if (dist < minDistToLeft) {
            minDistToLeft = dist;
            closestToLeft = tip;
          }
        });

        // Check if hand is within grab radius AND pinching
        if (closestToLeft && minDistToLeft <= GRAB_RADIUS && closestToLeft.isPinched) {
          if (!state.leftGrabbed) {
            // Start grabbing
            state.leftGrabbed = true;
            state.leftHandId = closestToLeft.handId;
          }
          // Stick endpoint to hand
          state.leftEnd = { ...closestToLeft };
          leftHandTip = closestToLeft;
        } else if (state.leftGrabbed) {
          // Release if pinch stops OR hand moves beyond grab radius + hysteresis
          if (!closestToLeft || !closestToLeft.isPinched || minDistToLeft > GRAB_RADIUS + RELEASE_HYSTERESIS) {
            state.leftGrabbed = false;
            state.leftHandId = null;
          } else {
            // Still within hysteresis zone and pinching, keep grabbing
            if (closestToLeft) {
              state.leftEnd = { ...closestToLeft };
              leftHandTip = closestToLeft;
            }
          }
        }
      }

      // Process grab/release logic for right endpoint
      if (handTips.length > 0 && state.rightEnd) {
        // Find closest hand tip to right endpoint
        let closestToRight: HandTip | null = null;
        let minDistToRight = Infinity;
        
        handTips.forEach((tip) => {
          const dist = distance(tip, state.rightEnd!);
          if (dist < minDistToRight) {
            minDistToRight = dist;
            closestToRight = tip;
          }
        });

        // Check if hand is within grab radius AND pinching
        if (closestToRight && minDistToRight <= GRAB_RADIUS && closestToRight.isPinched) {
          if (!state.rightGrabbed) {
            // Start grabbing
            state.rightGrabbed = true;
            state.rightHandId = closestToRight.handId;
          }
          // Stick endpoint to hand
          state.rightEnd = { ...closestToRight };
          rightHandTip = closestToRight;
        } else if (state.rightGrabbed) {
          // Release if pinch stops OR hand moves beyond grab radius + hysteresis
          if (!closestToRight || !closestToRight.isPinched || minDistToRight > GRAB_RADIUS + RELEASE_HYSTERESIS) {
            state.rightGrabbed = false;
            state.rightHandId = null;
          } else {
            // Still within hysteresis zone and pinching, keep grabbing
            if (closestToRight) {
              state.rightEnd = { ...closestToRight };
              rightHandTip = closestToRight;
            }
          }
        }
      }

      // Easing: if not grabbed, ease back toward anchor
      if (state.leftEnd && !state.leftGrabbed) {
        state.leftEnd = lerp(state.leftEnd, leftAnchor, EASING_FACTOR);
      }
      if (state.rightEnd && !state.rightGrabbed) {
        state.rightEnd = lerp(state.rightEnd, rightAnchor, EASING_FACTOR);
      }

      // Draw hand count indicator (debug)
      if (hands && hands.length > 1) {
        ctx.fillStyle = '#00ff00';
        ctx.font = '20px Arial';
        ctx.fillText(`${hands.length} hands detected`, 10, 30);
      }

      // Draw anchor points (rest position)
      ctx.fillStyle = '#999';
      ctx.beginPath();
      ctx.arc(leftAnchor.x, leftAnchor.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightAnchor.x, rightAnchor.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw grab zones (when hands are near but not grabbing)
      if (handTips.length > 0 && state.leftEnd && state.rightEnd) {
        handTips.forEach((tip) => {
          const distToLeft = distance(tip, state.leftEnd!);
          const distToRight = distance(tip, state.rightEnd!);
          
          // Show grab zone indicator if hand is near left endpoint but not grabbing
          if (distToLeft <= GRAB_RADIUS && !state.leftGrabbed && distToLeft < distToRight) {
            ctx.beginPath();
            ctx.arc(state.leftEnd.x, state.leftEnd.y, GRAB_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(78, 205, 196, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          
          // Show grab zone indicator if hand is near right endpoint but not grabbing
          if (distToRight <= GRAB_RADIUS && !state.rightGrabbed && distToRight < distToLeft) {
            ctx.beginPath();
            ctx.arc(state.rightEnd.x, state.rightEnd.y, GRAB_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(78, 205, 196, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }

      // Draw string line
      if (state.leftEnd && state.rightEnd) {
        let [leftX, leftY] = clampToCanvas(state.leftEnd.x, state.leftEnd.y, canvas);
        let [rightX, rightY] = clampToCanvas(state.rightEnd.x, state.rightEnd.y, canvas);
        ctx.beginPath();
        ctx.moveTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw connection line from hand to endpoint when grabbed
      if (state.leftGrabbed && leftHandTip && state.leftEnd) {
        let [tipX, tipY] = clampToCanvas(leftHandTip.x, leftHandTip.y, canvas);
        let [endX, endY] = clampToCanvas(state.leftEnd.x, state.leftEnd.y, canvas);
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#4ECDC4';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (state.rightGrabbed && rightHandTip && state.rightEnd) {
        let [tipX, tipY] = clampToCanvas(rightHandTip.x, rightHandTip.y, canvas);
        let [endX, endY] = clampToCanvas(state.rightEnd.x, state.rightEnd.y, canvas);
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#4ECDC4';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw grab halos at string endpoints when grabbed
      if (state.leftGrabbed && state.leftEnd) {
        ctx.beginPath();
        ctx.arc(state.leftEnd.x, state.leftEnd.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#4ECDC4';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
        ctx.fill();
      }

      if (state.rightGrabbed && state.rightEnd) {
        ctx.beginPath();
        ctx.arc(state.rightEnd.x, state.rightEnd.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#4ECDC4';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
        ctx.fill();
      }

      // Draw large, visible markers at string endpoints
      if (state.leftEnd) {
        ctx.beginPath();
        ctx.arc(state.leftEnd.x, state.leftEnd.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = state.leftGrabbed ? '#4ECDC4' : '#FF6B6B';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (state.rightEnd) {
        ctx.beginPath();
        ctx.arc(state.rightEnd.x, state.rightEnd.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = state.rightGrabbed ? '#4ECDC4' : '#FF6B6B';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Notify parent component of state changes
      if (onStateChange && state.leftEnd && state.rightEnd) {
        onStateChange({
          leftEnd: state.leftEnd,
          rightEnd: state.rightEnd,
          leftGrabbed: state.leftGrabbed,
          rightGrabbed: state.rightGrabbed,
        });
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hands, video, width, height, onStateChange]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

