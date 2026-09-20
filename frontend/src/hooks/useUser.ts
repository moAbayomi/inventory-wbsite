import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { editUser, deleteUser } from "../api/users";
import { getListUsers, getUser } from "../api/users";
import { useAuth } from "./useAuth";
import { userKeys } from "../queries/keys";
import type { UserEditData } from "../schemas/user";

export function useUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userKeys.all,
    queryFn: getListUsers,
    enabled: !!user,
    staleTime: 60_000,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserEditData }) =>
      editUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    updateUser, 
    removeUser
  }
}

export function useUser(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => getUser(id),
    enabled: !!user && !!id,
    staleTime: 60_000,
  });
}
