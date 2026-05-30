'use client';

import { useState } from 'react';
import { ZoomIn } from 'lucide-react';

interface ScreenshotViewerProps {
  filename: string | null;
}

export function ScreenshotViewer({ filename }: ScreenshotViewerProps) {
  const [zoomed, setZoomed] = useState(false);

  if (!filename) {
    return <p className="text-sm text-gray-400 italic">No screenshot uploaded</p>;
  }

  const src = `/api/proxy/uploads/${filename}`;

  return (
    <>
      <div
        className="relative cursor-pointer group w-full max-w-sm rounded-lg overflow-hidden border border-gray-200"
        onClick={() => setZoomed(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Payment screenshot" className="w-full object-contain" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
          <ZoomIn className="text-white opacity-0 group-hover:opacity-100" size={32} />
        </div>
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Payment screenshot"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
