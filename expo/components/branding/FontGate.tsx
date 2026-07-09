import React from 'react';
import { useAppFonts } from '@/hooks/useAppFonts';

interface FontGateProps {
  children: React.ReactNode;
}

/** Loads website fonts without blocking app startup (build 63 could appear frozen/crash on blank screen). */
export function FontGate({ children }: FontGateProps) {
  useAppFonts();
  return <>{children}</>;
}
