import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/health-talk")({
  ssr: false,
  component: () => <Navigate to="/admin" replace />,
});


