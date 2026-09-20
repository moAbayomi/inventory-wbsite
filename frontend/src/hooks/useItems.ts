import { getInventoryItems } from "../api/items";
import { useQuery } from "@tanstack/react-query";
import { itemKeys } from "../queries/keys";
import { useAuth } from "./useAuth";

export const useItems = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: itemKeys.list,
    queryFn: getInventoryItems,
    enabled: !!user,
    staleTime: 60_000,
  });
};
