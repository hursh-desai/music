/**
 * Calculate distance between two points
 */
export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Convert video coordinates to canvas coordinates
 */
export function videoToCanvas(
  vx: number,
  vy: number,
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null
): [number, number] {
  if (!video || !canvas) return [vx, vy];

  const scaleX = canvas.width / video.videoWidth;
  const scaleY = canvas.height / video.videoHeight;

  return [vx * scaleX, vy * scaleY];
}

/**
 * Compute string tension based on hand positions
 */
export function computeTension(
  leftEnd: { x: number; y: number },
  rightEnd: { x: number; y: number },
  leftAnchor: { x: number; y: number },
  rightAnchor: { x: number; y: number },
  maxStretch = 100
): number {
  const restLength = distance(leftAnchor, rightAnchor);
  const currentLength = distance(leftEnd, rightEnd);
  const stretch = Math.max(0, currentLength - restLength);

  // Normalize to [0, 1]
  const tension = Math.min(1, stretch / maxStretch);
  return tension;
}

/**
 * Compute left side stretch (how far left endpoint has moved from anchor)
 */
export function computeLeftStretch(
  leftEnd: { x: number; y: number },
  leftAnchor: { x: number; y: number },
  maxStretch = 100
): number {
  const stretch = distance(leftEnd, leftAnchor);
  return Math.min(1, stretch / maxStretch);
}

/**
 * Compute right side stretch (how far right endpoint has moved from anchor)
 */
export function computeRightStretch(
  rightEnd: { x: number; y: number },
  rightAnchor: { x: number; y: number },
  maxStretch = 100
): number {
  const stretch = distance(rightEnd, rightAnchor);
  return Math.min(1, stretch / maxStretch);
}

/**
 * Compute string angle (tilt from horizontal)
 */
export function computeStringAngle(
  leftEnd: { x: number; y: number },
  rightEnd: { x: number; y: number }
): number {
  const dx = rightEnd.x - leftEnd.x;
  const dy = rightEnd.y - leftEnd.y;
  
  // Calculate angle from horizontal
  const angle = Math.atan2(dy, dx);
  
  // Normalize to [-1, 1] based on vertical component
  const normalized = Math.sin(angle);
  
  return Math.max(-1, Math.min(1, normalized));
}

/**
 * Compute tension velocity (rate of change of tension)
 */
export function computeTensionVelocity(
  currentTension: number,
  previousTension: number,
  deltaTime: number
): number {
  if (deltaTime <= 0) return 0;
  return (currentTension - previousTension) / deltaTime;
}

export interface StringControls {
  tension: number;
  leftStretch: number;
  rightStretch: number;
  angle: number;
  tensionVelocity: number;
  isGrabbed: {
    left: boolean;
    right: boolean;
  };
}

/**
 * Compute enhanced string controls from geometry
 */
export function computeStringControls(
  leftEnd: { x: number; y: number },
  rightEnd: { x: number; y: number },
  leftAnchor: { x: number; y: number },
  rightAnchor: { x: number; y: number },
  previousTension = 0,
  deltaTime = 0.016, // Default to ~60fps
  leftGrabbed = false,
  rightGrabbed = false,
  maxStretch = 100
): StringControls {
  const tension = computeTension(leftEnd, rightEnd, leftAnchor, rightAnchor, maxStretch);
  const leftStretch = computeLeftStretch(leftEnd, leftAnchor, maxStretch);
  const rightStretch = computeRightStretch(rightEnd, rightAnchor, maxStretch);
  const angle = computeStringAngle(leftEnd, rightEnd);
  const tensionVelocity = computeTensionVelocity(tension, previousTension, deltaTime);

  return {
    tension,
    leftStretch,
    rightStretch,
    angle,
    tensionVelocity,
    isGrabbed: {
      left: leftGrabbed,
      right: rightGrabbed,
    },
  };
}

