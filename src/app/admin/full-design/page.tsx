import ProtectedRoute from "@/components/ProtectedRoute";
import AdminFullDesignPage from "@/components/AdminFullDesignPage";
export default function AdminFullDesignRoute() {
  return <ProtectedRoute><AdminFullDesignPage /></ProtectedRoute>;
}
