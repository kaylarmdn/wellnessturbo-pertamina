import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/health-talk/$id")({
  ssr: false,
  component: () => <Navigate to="/" replace />,
});

