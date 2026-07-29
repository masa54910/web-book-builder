import BookManagementPage from "@/components/BookManagementPage";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function BookManagementRoute() {
  return (
    <ProtectedRoute>
      <BookManagementPage />
    </ProtectedRoute>
  );
}
