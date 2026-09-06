import ProtectedRoute from "@/components/ProtectedRoute";
import AdminInquiriesPage from "@/components/AdminInquiriesPage";

export default function AdminInquiriesRoute() {
  return (
    <ProtectedRoute>
      <AdminInquiriesPage />
    </ProtectedRoute>
  );
}

