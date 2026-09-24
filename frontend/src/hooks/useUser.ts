import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import { editUser, deleteUser } from "../api/users";
import { getListUsers, getUser } from "../api/users";
import { useAuth } from "./useAuth";
import { userKeys } from "../queries/keys";
import type { UserEditData } from "../schemas/user";
import type { User } from "../types/api";

export function useUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userKeys.all,
    queryFn: getListUsers,
    enabled: !!user,
    staleTime: 60_000,
  });

  const updateUser = useMutation<
    User,
    AxiosError<{ error?: string }>,
    { id: string; data: UserEditData }
  >({
    mutationFn: ({ id, data }: { id: string; data: UserEditData }) =>
      editUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
    // Without this, a failed update (deactivate/reactivate included, since
    // both go through this same mutation) just failed silently -- the
    // button's loading state cleared and nothing else happened, which is
    // exactly what "I can't remove a user, nothing happens" turned out to
    // be caused by on the backend side.
    onError: (err: AxiosError<{ error?: string }>) => {
      toast.error(err.response?.data?.error ?? "Couldn't update this user");
    },
  });

  const removeUser = useMutation<void, AxiosError<{ error?: string }>, string>({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
    onError: (err: AxiosError<{ error?: string }>) => {
      toast.error(err.response?.data?.error ?? "Couldn't deactivate this user");
    },
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
