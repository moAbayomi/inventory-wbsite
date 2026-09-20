import api from "./axios";
import type { Invite } from "../types/api";
import type { InviteFormData } from "../schemas/invites";
import type { User } from "../types/api";

export const sendInvite = async (data: InviteFormData): Promise<Invite> => {
  const res = await api.post<{ invite: Invite }>("/invites", data);

  return res.data.invite;
};

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
  confirmPassword: string;
}

export async function acceptInvite(data: AcceptInviteInput): Promise<User> {
  const res = await api.post<{ user: User }>("/invites/accept", data);
  return res.data.user;
}
