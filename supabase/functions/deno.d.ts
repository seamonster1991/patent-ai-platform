// Deno type declarations for Supabase Edge Functions
// This file should only be used within Supabase Edge Functions

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  
  export const env: Env;
}

// Minimal Deno types for Edge Functions
// Note: Most global types are already available in the Deno runtime