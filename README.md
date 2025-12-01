# Handpose String Music

A Next.js web application that uses ml5.js Handpose to track hand positions from your webcam and control a virtual string. The tension of the string drives Tone.js audio parameters to create music.

## Features

- Real-time hand tracking using MediaPipe Hands
- Interactive string visualization with grab zones and visual feedback
- **Grab/Release System**: Stateful endpoints with grab zones - bring your hands within 50px of an endpoint to grab it
- **Bidirectional Control**: Pull the string from both sides independently
- **Spring Physics**: Endpoints automatically ease back to anchors when released
- **Enhanced Audio Control with Wide Dynamic Range**:
  - **Volume**: Wide dynamic range (-30dB to 0dB) controlled by tension
  - **Frequency**: Hybrid control - base pitch from position, tension adds range (220Hz to 880Hz)
  - **Filter Cutoff**: Tension-controlled brightness (200Hz to 8000Hz)
  - **Distortion**: Tension-controlled distortion amount (0 to 0.8)
  - **Reverb**: Tension-controlled reverb wet level (0 to 0.5)
  - **Vibrato/Modulation**: String angle affects LFO depth (0 to 10Hz)
  - Velocity-based pluck detection for percussive sounds
- Custom Tone.js configuration with adjustable sensitivity curves

## Prerequisites

- Node.js 18+ and npm
- Modern browser with WebRTC support (for webcam access)
- Webcam access permissions

## Installation

1. Install dependencies:

```bash
npm install
```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note:** Webcam access requires HTTPS or localhost. The app will request webcam permissions when you load the page.

## How It Works

1. **Hand Tracking**: MediaPipe Hands tracks your hands from the webcam feed
2. **Grab Detection**: When your fingertip comes within 50px of a string endpoint, it "grabs" that endpoint
3. **String Visualization**: Grabbed endpoints follow your hands; released endpoints ease back to anchors
4. **Enhanced Control Calculation**: The system computes multiple values from string geometry:
   - **Global Tension**: How much longer the string is than its rest length
   - **Left/Right Stretch**: How far each endpoint has moved from its anchor
   - **String Angle**: The tilt of the string from horizontal
   - **Tension Velocity**: How quickly tension is changing
5. **Audio Generation**: These controls map to Tone.js parameters with wide dynamic range:
   - **Frequency**: 220Hz to 880Hz (hybrid: base from position, tension adds range)
   - **Volume**: -30dB to 0dB (wide dynamic range controlled by tension)
   - **Filter Cutoff**: 200Hz to 8000Hz (tension-controlled brightness)
   - **Distortion**: 0 to 0.8 (tension-controlled distortion amount)
   - **Reverb**: 0 to 0.5 wet level (tension-controlled spatial effect)
   - **Vibrato**: 0 to 10Hz modulation depth (angle-controlled LFO)
   - **Pluck Detection**: Rapid tension changes trigger percussive attacks

## Usage

1. Allow webcam access when prompted
2. Position your hands so they're tracked by the system (audio will start automatically when hands are detected)
4. **Grabbing the String**:
   - Bring your fingertip within 50px of a string endpoint (left or right) to grab it
   - You'll see a dashed circle appear when you're in the grab zone
   - Once grabbed, the endpoint follows your hand and shows a solid halo
   - Release by moving your hand away beyond the release threshold
5. **Playing Techniques**:
   - **Slow Pull**: Gradually stretch the string for sustained, bowed tones
   - **Quick Pluck**: Rapidly pull and release for percussive pluck sounds
   - **Two-Hand Control**: Use both hands to control stereo panning and create complex gestures
   - **Angle Effects**: Tilt the string up or down to affect modulation
6. **Audio Response**:
   - **Tension Control**: Pulling harder dramatically increases volume, pitch, brightness, distortion, and reverb
   - **Position Control**: Moving left/right changes base pitch
   - **Angle Control**: Tilting the string adds vibrato/modulation
   - **Dynamic Range**: Wide volume range (-30dB to 0dB) allows for subtle whispers to powerful sounds
   - Rapid movements trigger pluck detection
   - At least one endpoint must be grabbed for sound to play

## Project Structure

```
├── app/
│   ├── layout.js          # Root layout
│   └── page.js            # Main page component
├── components/
│   └── StringCanvas.js    # Canvas component for string visualization
├── lib/
│   ├── audioConfig.js     # Tone.js audio configuration
│   ├── handpose.js        # Handpose tracking hook
│   └── utils.js           # Utility functions (distance, tension, etc.)
├── next.config.js         # Next.js configuration
└── package.json           # Dependencies
```

## Customization

### Audio Configuration (`lib/audioConfig.ts`)

You can customize the audio behavior with extensive dynamic range controls:

- **Synth Type**: Change synth type (Synth, AMSynth, FMSynth, etc.)
- **Frequency Range**: Adjust pitch range (default: 220Hz to 880Hz)
  - Base frequency comes from position (220Hz to 660Hz)
  - Tension adds additional range up to 880Hz
- **Volume Range**: Wide dynamic range (default: -30dB to 0dB)
  - Much wider than before for dramatic volume changes
- **Filter Cutoff**: Adjust timbre range (default: 200Hz to 8000Hz)
  - Responds to tension for brightness control
- **Distortion Range**: Control distortion amount (default: 0 to 0.8)
  - Higher tension = more distortion
- **Reverb Range**: Control reverb wet level (default: 0 to 0.5)
  - Higher tension = more spatial effect
- **Modulation Depth**: Adjust angle-based vibrato (default: 0 to 10Hz)
- **Sensitivity Curves**: Customize response curves for each parameter:
  - **Volume Curve**: 0.8 (slightly less aggressive than linear)
  - **Frequency Curve**: 1.0 (linear)
  - **Filter Cutoff Curve**: 2.0 (exponential for dramatic brightness)
  - **Distortion Curve**: 1.5 (moderate curve)
  - **Reverb Curve**: 1.0 (linear)
- **Pluck Threshold**: Set velocity threshold for pluck detection (default: 0.1)
- **Envelope**: Modify attack, decay, sustain, release settings
- **Ramp Time**: Change parameter transition smoothness (default: 0.05s)

### Tension Configuration (`lib/utils.ts`)

You can customize how tension is calculated:

- **Max Stretch**: Maximum stretch distance in pixels before tension reaches 1.0 (default: 100px)
  - Lower values = higher tension sensitivity (louder volume at smaller stretches)
  - Higher values = lower tension sensitivity (requires more stretch for full volume)

### Interaction Parameters (`components/StringCanvas.js`)

- **GRAB_RADIUS**: Distance threshold for grabbing (default: 30px)
- **RELEASE_HYSTERESIS**: Extra distance before release to prevent jitter (default: 10px)
- **EASING_FACTOR**: Spring return speed when released (default: 0.15)
- **PINCH_THRESHOLD**: Distance between thumb and index finger tips to detect pinch (default: 50px)
- **PINCH_RELEASE_THRESHOLD**: Larger distance threshold for releasing pinch (hysteresis, default: 80px)
- **PINCH_DEBOUNCE_TIME**: Milliseconds to wait before releasing after pinch stops (default: 150ms)

## Technologies

- **Next.js** - React framework
- **MediaPipe Hands** - Hand tracking via @mediapipe/hands
- **Tone.js** - Web Audio framework (loaded via CDN)
- **React** - UI library

## Advanced Features

### Grab Zones
- Visual feedback shows grab zones when hands are near endpoints
- Dashed circles indicate proximity; solid halos indicate active grabbing
- Connection lines show which hand controls which endpoint

### Per-Side Control
- Independent left and right endpoint tracking
- Each side can be grabbed and released independently
- Per-side stretch values drive stereo panning

### Pluck vs Bow Detection
- System detects rapid tension changes (velocity spikes)
- Plucks trigger percussive attack envelopes
- Slow, sustained pulls create bowed string tones

### Enhanced Dynamic Range
- **Wide Volume Range**: -30dB to 0dB allows for subtle whispers to powerful sounds
- **Tension-Responsive Effects**: Distortion and reverb increase with tension
- **Hybrid Frequency Control**: Position sets base pitch, tension adds range
- **Exponential Filter Response**: Filter cutoff uses exponential curve for dramatic brightness changes
- **Configurable Sensitivity**: Each parameter has its own curve for fine-tuned control

### Spring Physics
- Released endpoints smoothly ease back to anchor positions
- Creates natural, physical feel to the interaction
- Prevents endpoints from getting stuck in random positions

## License

MIT

