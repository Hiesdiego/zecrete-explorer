// src/components/HotkeysClient.tsx
'use client';
import React from 'react';
import { useHotkeys } from '@/hooks/useHotkeys';

export default function HotkeysClient({ children }: { children: React.ReactNode }) {
  useHotkeys();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* header, ThemeToggle, main, footer (move ThemeToggle here too) */}
      {children}
    </div>
  );
}
