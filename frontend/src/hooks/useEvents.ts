import { useQuery } from "@tanstack/react-query";
import { listEvents, type ListEventsParams } from "../api/events";
import { eventKeys } from "../queries/keys";
import { useAuth } from "./useAuth";

export function useEvents(params: ListEventsParams = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => listEvents(params),
    enabled: !!user,
  });
}
