import AnalyticsOverviewPage from "@/components/AnalyticsOverviewPage";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AnalyticsRoute() {
  return (
    <ProtectedRoute>
      <AnalyticsOverviewPage />
    </ProtectedRoute>
  );
}
