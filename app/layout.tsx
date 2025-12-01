import Script from 'next/script';
import ToneLoader from '@/components/ToneLoader';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Handpose String Music',
  description: 'Control a virtual string with your hands to create music',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <Script src="https://unpkg.com/ml5@0.12.2/dist/ml5.min.js" strategy="beforeInteractive" />
        <ToneLoader />
        {children}
      </body>
    </html>
  );
}

