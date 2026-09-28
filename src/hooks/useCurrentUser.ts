import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/api";
import { getStoredUserId } from "@/lib/session";

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUserId(getStoredUserId());
    setReady(true);
  }, []);

  const query = useQuery({
    queryKey: ["current-user", userId],
    queryFn: () => getUser(userId as string),
    enabled: !!userId,
  });

  return {
    ready: ready && (!userId || !query.isLoading),
    user: query.data ?? null,
    userId,
    refetch: query.refetch,
  };
}
