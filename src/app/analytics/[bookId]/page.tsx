import AnalyticsDetailPage from "@/components/AnalyticsDetailPage";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AnalyticsDetailRoute() {
  return (
    <ProtectedRoute>
      <AnalyticsDetailPage />
    </ProtectedRoute>
  );
}
