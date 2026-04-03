import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names conditionally and merges them for Tailwind CSS
 * @param  {...any} inputs - Class names, objects, or arrays to be merged
 * @returns {string} - Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
} 