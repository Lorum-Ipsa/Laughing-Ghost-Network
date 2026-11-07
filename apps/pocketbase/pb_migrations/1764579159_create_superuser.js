/// <reference path="../pb_data/types.d.ts" />

// No-op: superuser provisioning is a deliberate administrative action.
// The original Horizons migration reset superuser credentials from env vars
// whenever it ran. Restoring a backup must not silently rotate credentials.
// Keep the filename for migration history; create the first superuser through
// the PocketBase CLI or the private local installer, never public signup.
migrate((app) => {
  // No automatic privileged-account provisioning.
}, (app) => {
  // Rollback must not delete administrators.
});
