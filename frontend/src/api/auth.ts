import api from "./axios";
import { setAccessToken, clearAccessToken } from "./tokenStorage";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
}

export const getMe = async (): Promise<User> => {
  const res = await api.post("/auth/refresh");
  const { accessToken, user } = res.data;
  setAccessToken(accessToken);
  return user;
};

export const loginRequest = async (
  email: string,
  password: string,
): Promise<User> => {
  const res = await api.post("/auth/login", { email, password });
  // The backend's login response shape is { accessToken, user } (see
  // authController.ts) -- NOT { token, user }. This used to destructure
  // `token`, which is always undefined for this endpoint (register returns
  // `token`, login returns `accessToken` -- the two aren't consistent), so
  // setAccessToken(undefined) ran on every login. The login itself still
  // "succeeded" (200, user set), but no access token ever made it into
  // memory, so every subsequent request went out with no Authorization
  // header, 401'd, and even the automatic refresh-retry could only help if
  // the refresh cookie itself was also working -- from the outside this
  // looked like everything was broken right after a successful login.
  const { user, accessToken } = res.data;
  setAccessToken(accessToken);
  return user;
};

export const logoutRequest = async (): Promise<void> => {
  try {
    // The backend only registers this as POST (authRoutes.ts) -- a GET here
    // never matched that route at all, it just 404'd silently. The local
    // access token still got cleared below either way (that's a `finally`),
    // which was hiding the failure: it *looked* like logout did something,
    // but the server never revoked the refresh token or cleared its cookie.
    await api.post("/auth/logout");
  } finally {
    clearAccessToken();
  }
};
