import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 3, // 3 minutes stale time
        gcTime: 1000 * 60 * 15, // 15 minutes garbage collection time
        refetchOnWindowFocus: false, // Prevent refetch bursts on window focus
        retry: 1, // Minimize lag on failed requests
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 1000 * 60 * 2,
  });

  return router;
};
