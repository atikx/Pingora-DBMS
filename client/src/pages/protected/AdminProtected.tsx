import { useAuthStore } from "@/lib/store";
import { defineAbilityFor } from "@/lib/ability";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function AdminProtected() {
  const { user } = useAuthStore((state) => state);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (user) {
      const ability = defineAbilityFor(user);
      if (!ability.can("create", "post")) {
        toast.error(" Access Denied");
        setShouldRedirect(true);
      }
    }
  }, [user]);

  if (!user) return null;
  if (shouldRedirect) return <Navigate to="/" replace />;

  return <Outlet />;
}
