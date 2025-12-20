import { HTMLAttributes } from 'react';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'card';
export type SkeletonAnimation = 'pulse' | 'wave' | 'none';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  animation?: SkeletonAnimation;
  count?: number;
}
