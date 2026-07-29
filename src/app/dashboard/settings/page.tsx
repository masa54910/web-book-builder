import ProfileSettingsPage from "@/components/ProfileSettingsPage";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function SettingsRoute() {
  return (
    <ProtectedRoute>
      <ProfileSettingsPage />
    </ProtectedRoute>
  );
}
