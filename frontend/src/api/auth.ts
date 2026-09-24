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
  const { user, token } = res.data;
  setAccessToken(token);
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
