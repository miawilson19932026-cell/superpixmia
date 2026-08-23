import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

// SSR-safe lazy singleton. Never call this at module scope or during render —
// only from browser effects / event handlers. The prerender pass
// (scripts/prerender.mjs) runs renderToString in Node where window/localStorage
// don't exist; createClient() touches both, so it must never run there.
// Returns null when env vars are missing (build passes, UI degrades gracefully).
export function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !anonKey) return null

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // handles email-confirm / password-recovery redirects
        // Fixed storage key so the session lives at a known location (e2e tests
        // inject a fake session here to exercise the login-gated flows).
        storageKey: 'spm-auth-token',
      },
    })
  }
  return client
}
