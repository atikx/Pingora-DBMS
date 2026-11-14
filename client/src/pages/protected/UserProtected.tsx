import { useAuthStore } from "@/lib/store";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function UserProtected() {
  const { user } = useAuthStore((state) => state);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error("Please login to access this page");
      setShouldRedirect(true);
    }
  }, [user]);

  if (shouldRedirect) return <Navigate to="/auth" replace />;

  return <Outlet />;
}
