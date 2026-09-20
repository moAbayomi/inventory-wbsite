import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { sendInvite } from "../api/invites";
import type { InviteFormData } from "../schemas/invites";
import type { Invite } from "../types/api";
import { inviteKeys } from "../queries/keys";

export function useInvite() {
  const queryClient = useQueryClient();

  // Left untyped, useMutation's TError defaults to plain `Error` -- which
  // has no `.response` property, so `createInvite.error?.response` doesn't
  // compile. Naming the real shape (AxiosError) here is what the rest of
  // the app's mutations already do (see useSales.ts's useCreateSale).
  const createInvite = useMutation<
    Invite,
    AxiosError<{ error?: string }>,
    InviteFormData
  >({
    mutationFn: sendInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.all });
    },
  });

  return { createInvite };
}