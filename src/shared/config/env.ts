/**
 * Get environment variable with validation
 * Returns empty string instead of 'undefined' if not set
 */
function getEnvVar(name: string): string {
  const value = import.meta.env[name];
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

export const env = {
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  },
  miro: {
    clientId: getEnvVar('VITE_MIRO_CLIENT_ID'),
  },
  auth: {
    // Secret for deriving deterministic passwords
    secret: getEnvVar('VITE_AUTH_SECRET'),
  },
  // Main Admin (Super Admin from environment - cannot be modified via UI)
  mainAdmin: {
    email: getEnvVar('VITE_ADMIN_EMAIL'),
    // Fixed password for admin login (bypasses Miro-derived password)
    password: getEnvVar('VITE_ADMIN_PASSWORD'),
  },
  app: {
    env: getEnvVar('VITE_APP_ENV') || 'development',
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    // App URL for public assets (logo, etc.)
    url: getEnvVar('VITE_APP_URL') || 'https://brianna-dawes-studio-app.vercel.app',
    // Feature flags (default OFF for safe rollout)
    useEdgeApi: getEnvVar('VITE_USE_EDGE_API') === '1',
    useSyncJobs: getEnvVar('VITE_USE_SYNC_JOBS') === '1',
    useDeliverableVersionsTable: getEnvVar('VITE_USE_DELIVERABLE_VERSIONS_TABLE') === '1',
    disableAnonRest: getEnvVar('VITE_DISABLE_ANON_REST') === '1',
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
 * Call this early in app initialization to catch configuration issues
 */
export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const required: [string, string][] = [
    ['VITE_SUPABASE_URL', env.supabase.url],
    ['VITE_SUPABASE_ANON_KEY', env.supabase.anonKey],
    ['VITE_AUTH_SECRET', env.auth.secret],
  ];

  const recommended: [string, string][] = [
    ['VITE_MIRO_CLIENT_ID', env.miro.clientId],
    ['VITE_ADMIN_EMAIL', env.mainAdmin.email],
  ];

  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  const warnings = recommended
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    // Using console.error here intentionally - this runs at app bootstrap
    // before the logger may be initialized
    console.error('[ENV] Missing REQUIRED environment variables:', missing);
    console.error('[ENV] The app will not function correctly without these variables.');
  }

  if (warnings.length > 0) {
    console.warn('[ENV] Missing recommended environment variables:', warnings);
  }

  // Validate AUTH_SECRET length
  if (env.auth.secret && env.auth.secret.length < 32) {
    console.error('[ENV] VITE_AUTH_SECRET must be at least 32 characters for security');
    missing.push('VITE_AUTH_SECRET (too short)');
  }

  return { valid: missing.length === 0, missing, warnings };
}
