import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { isStoredAdmin } from "@/lib/session";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecking(false);
      setIsAdmin(true);
      return;
    }
    const authed = isStoredAdmin();
    setIsAdmin(authed);
    setChecking(false);
    if (!authed) {
      navigate({ to: "/admin/login" });
    }
  }, [navigate, pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (checking || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Memeriksa akses admin…
      </div>
    );
  }

  return <>{children}</>;
}
