/* Public Supabase settings. Both values are safe to publish: the anon key only allows what the
   database's row-level security policies allow. Find them in Supabase -> Project Settings -> API.
   While these are empty, accounts and the paywall are switched off and the site is fully free.
   Accounts (sign-in, synced progress, leaderboards, clubs, emails) work as soon as both are set.
   The 25-hand paywall and Pro plans only switch on when `payments` is true, after Stripe is set up. */
window.PIQ_CONFIG = {
  supabaseUrl: 'https://pupddxyrckkyrorkmqld.supabase.co',
  // the legacy "anon" key (public; row-level security decides what it can read)
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGRkeHlyY2treXJvcmttcWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTY5OTYsImV4cCI6MjEwNjI5Mjk5Nn0.ogErRrxc8AN_YWXdnW-whJNDGEj24bjtk9zY-_fZbKs',
  payments: false        // true once Stripe and the Cloudflare secrets are in place (SETUP.md step 2-3)
};
