import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function RequireUser({ children }: { children: ReactNode }) {
  const { ready, user } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/" });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Memuat…
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
