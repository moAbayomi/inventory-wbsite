import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";
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
      // Setting the auth query straight to `null` (rather than just
      // removing it) makes ProtectedRoute's `user` value fall to `null`
      // on THIS render, so its <Navigate to="/login"> fires immediately.
      // The old code called queryClient.clear() right here instead --
      // wiping every cached query, including ones actively observed by
      // whatever protected page you were still standing on, out from
      // under still-mounted components before React had a chance to
      // unmount them. That's what "vanishes and needs a refresh" was:
      // components rendering against caches that had just been erased
      // underneath them, instead of a clean redirect. Deferring the full
      // clear() by a tick lets the redirect (and the resulting unmount of
      // every protected screen) happen first; it's just cleanup of
      // leftover cached data at that point, not something anything is
      // still reading.
      queryClient.setQueryData(authKeys.me, null);
      setTimeout(() => queryClient.clear(), 0);
    },
    // This had no error handling at all before -- a failed request (like
    // the GET/POST method mismatch that used to be here) failed completely
    // silently, with nothing telling you it hadn't actually logged you out
    // server-side. Even though logoutRequest's own `finally` always clears
    // the local token, a real failure here means the refresh-token cookie
    // is still valid server-side, so this is worth surfacing rather than
    // pretending it worked.
    onError: () => {
      toast.error("Logged out locally, but the server didn't confirm it");
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
