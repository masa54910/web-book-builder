import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const profileRepository = source("src/lib/profileRepository.ts");
const profileSettings = source("src/components/ProfileSettingsPage.tsx");
const dashboard = source("src/components/DashboardPage.tsx");
const appHeader = source("src/components/AppHeader.tsx");
const settingsRoute = source("src/app/settings/page.tsx");
const dashboardSettingsRoute = source("src/app/dashboard/settings/page.tsx");
const authorPageRepository = source("src/lib/authorPageRepository.server.ts");
const initialSchema = source("supabase/migrations/001_initial_beta_schema.sql");

assert.match(settingsRoute, /<ProtectedRoute>/);
assert.match(dashboardSettingsRoute, /<ProtectedRoute>/);
assert.match(settingsRoute, /<ProfileSettingsPage\s*\/>/);
assert.match(dashboardSettingsRoute, /<ProfileSettingsPage\s*\/>/);

for (const field of ["displayName", "bio", "avatarPath", "websiteUrl", "handle", "isPublic"]) {
  assert.match(profileSettings, new RegExp(field), `missing editable profile field: ${field}`);
}
assert.match(profileSettings, /getOwnProfile\(user\.id/);
assert.match(profileSettings, /saveOwnProfile\(profile\)/);
assert.match(profileSettings, /saveOwnAuthorLinks\(user\.id/);
assert.match(profileSettings, /isSaving/);
assert.match(profileSettings, /PROFILE_SAVE_ERROR_MESSAGE/);

assert.match(profileRepository, /from\("profiles"\)/);
assert.match(profileRepository, /eq\("id", userId\)/);
assert.match(profileRepository, /upsert\(payload, \{ onConflict: "id" \}\)/);
assert.match(initialSchema, /profiles_update_own/);
assert.match(initialSchema, /auth\.uid\(\) = id/);
assert.match(authorPageRepository, /from\("profiles"\)/);
assert.match(authorPageRepository, /is_public/);
assert.match(appHeader, /<Link href="\/settings">著者プロフィールを編集<\/Link>/);
assert.match(dashboard, /getOwnProfile\(user\.id/);
assert.match(dashboard, /authorPagePath\(profile\.handle\)/);
assert.doesNotMatch(dashboard, /<Button variant="secondary" href="\/settings">/);
assert.match(profileSettings, /公開プロフィール/);

console.log("Author profile direct editing / ownership / public display verification: PASS");
