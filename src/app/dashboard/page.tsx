import DashboardPage from "@/components/DashboardPage";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardRoute() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}
