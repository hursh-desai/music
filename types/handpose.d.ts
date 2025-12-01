// Type definitions for hand pose data structures

export interface Point {
  x: number;
  y: number;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandAnnotations {
  thumb: Array<[number, number] | Point>;
  indexFinger: Array<[number, number] | Point>;
  middleFinger: Array<[number, number] | Point>;
  ringFinger: Array<[number, number] | Point>;
  pinky: Array<[number, number] | Point>;
  palmBase: Array<[number, number] | Point>;
}

export interface Hand {
  landmarks: Array<[number, number, number]>;
  handedness: string;
  annotations?: HandAnnotations;
}

