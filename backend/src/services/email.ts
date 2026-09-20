import { Resend } from "resend";
import env from "../../env.ts";

const resend = new Resend(env.RESEND_API_KEY);

type SendResult =
  | { success: true; id: string | undefined }
  | { success: false; error: unknown };


export const sendEmail = async (to: string, subject: string, html: string): Promise<SendResult> => {
  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (e) {
    console.error("[email] send failed to", to, e);
    return { success: false, error: e };
  }
};
