import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get the correct base URL for the application
export function getBaseUrl(): string {
  // In browser, check if we're on localhost
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If it's localhost, check for Vercel deployment URL
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // For development, you can set this environment variable
      const productionUrl = import.meta.env.VITE_PRODUCTION_URL;
      if (productionUrl) {
        return productionUrl;
      }
      // Fallback to localhost for development
      return window.location.origin;
    }
    
    // For production domains, use the current origin
    return window.location.origin;
  }
  
  // Server-side fallback
  return import.meta.env.VITE_PRODUCTION_URL || 'http://localhost:8080';
}

// Alternative: Hardcode your production URL here for immediate fix
export function getProductionUrl(): string {
  // Replace this with your actual Vercel domain
  return 'https://forexcomplex.vercel.app';
}
