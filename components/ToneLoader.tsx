'use client';

import Script from 'next/script';

export default function ToneLoader() {
  return (
    <Script
      src="https://cdn.jsdelivr.net/npm/tone@latest/build/Tone.js"
      strategy="afterInteractive"
      onLoad={() => {
        // Suspend context immediately after Tone.js loads to prevent autoplay errors
        // The context will be resumed when user clicks "Start Audio"
        if (typeof window !== 'undefined' && window.Tone && window.Tone.context) {
          if (window.Tone.context.state === 'running') {
            window.Tone.context.suspend().catch(() => {
              // Ignore errors - context might already be suspended
            });
          }
        }
      }}
    />
  );
}

