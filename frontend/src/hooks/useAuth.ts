import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { loginRequest, logoutRequest, getMe, type User } from "../api/auth";
import { authKeys } from "../queries/keys";

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  message?: string;
}

export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60_000,
  });

  // The three generics on useMutation, in order: what a successful login
  // resolves to, what a failed one throws, and what you call it with.
  // Naming all three is what makes `error.response?.data?.error` below
  // type-checked instead of "any" pretending to be safe.
  const login = useMutation<User, AxiosError<{ error?: string }>, LoginCredentials>({
    mutationFn: ({ email, password }) => loginRequest(email, password),
    onSuccess: (user) => queryClient.setQueryData(authKeys.me, user),
  });

  const logout = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authKeys.me });
      queryClient.clear();
    },
  });

  const loginWithCredentials = async (
    email: string,
    password: string,
  ): Promise<LoginResult> => {
    try {
      await login.mutateAsync({ email, password });
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string }>;
      return { success: false, message: axiosError.response?.data?.error };
    }
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN",
    login: loginWithCredentials,
    logout: logout.mutate,
  };
};
