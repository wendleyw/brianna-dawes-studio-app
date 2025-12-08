export const env = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  },
  miro: {
    clientId: import.meta.env.VITE_MIRO_CLIENT_ID as string,
  },
  // Main Admin (Super Admin from environment - cannot be modified via UI)
  // Note: Auth is handled via Miro OAuth, no password needed in client
  mainAdmin: {
    email: import.meta.env.VITE_ADMIN_EMAIL as string,
  },
  app: {
    env: (import.meta.env.VITE_APP_ENV as string) || 'development',
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    // App URL for public assets (logo, etc.)
    url: (import.meta.env.VITE_APP_URL as string) || 'https://brianna-dawes-studio-app.vercel.app',
  },
  // Brand assets
  brand: {
    logoUrl: '/logo-brianna.png',
    logoVideoUrl: '/logo-animation.webm',
  },
} as const;

/**
 * Check if email is the main admin (super admin from env)
 */
export function isMainAdmin(email: string): boolean {
  return email?.toLowerCase() === env.mainAdmin.email?.toLowerCase();
}

/**
 * Validate required environment variables
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const required: [string, unknown][] = [
    ['VITE_SUPABASE_URL', env.supabase.url],
    ['VITE_SUPABASE_ANON_KEY', env.supabase.anonKey],
  ];

  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
  }

  return { valid: missing.length === 0, missing };
}
