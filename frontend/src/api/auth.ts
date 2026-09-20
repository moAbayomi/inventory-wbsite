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
    await api.get("/auth/logout");
  } finally {
    clearAccessToken();
  }
};
