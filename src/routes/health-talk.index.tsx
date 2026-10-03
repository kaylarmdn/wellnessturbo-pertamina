import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/health-talk/")({
  ssr: false,
  component: () => <Navigate to="/" replace />,
});

