import DashboardBookEditor from "@/components/DashboardBookEditor";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function NewBookRoute() {
  return (
    <ProtectedRoute>
      <DashboardBookEditor mode="new" />
    </ProtectedRoute>
  );
}
