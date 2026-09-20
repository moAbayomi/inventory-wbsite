import type { UserEditData } from "../schemas/user";
import type { User } from "../types/api";
import api from "./axios";

export const getListUsers = async (): Promise<User[]> => {
  const response = await api.get<{ users: User[] }>("/users");
  const { users } = response.data;
  return users;
};

export const getUser = async (id: string): Promise<User> => {
  const response = await api.get<{ user: User }>(`/users/${id}`);
  const { user } = response.data;
  return user;
};

export const editUser = async (id: string, data: UserEditData): Promise<User> => {
  const res = await api.patch<{ user: User }>(`/users/${id}`, data)
  const { user } = res.data
  return user;
}

export const deleteUser = async (id: string): Promise<void> => {
   await api.delete(`/users/${id}`)
}


