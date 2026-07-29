import DashboardBookEditor from "@/components/DashboardBookEditor";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function EditBookRoute() {
  return (
    <ProtectedRoute>
      <DashboardBookEditor mode="edit" />
    </ProtectedRoute>
  );
}
