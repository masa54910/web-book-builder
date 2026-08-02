import ProfileSettingsPage from "@/components/ProfileSettingsPage";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function SettingsShortcutRoute() {
  return (
    <ProtectedRoute>
      <ProfileSettingsPage />
    </ProtectedRoute>
  );
}
