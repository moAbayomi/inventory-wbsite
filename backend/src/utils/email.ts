import { z } from "zod";
import { eq, sql, type AnyColumn } from "drizzle-orm";

// Email addresses are case-insensitive in practice -- "Grace@Shop.com" and
// "grace@shop.com" are the same inbox. Everything that takes an email from
// a request goes through this schema, so what reaches a controller is
// already trimmed and lowercased, and that's what gets stored.
export const emailField = (message = "invalid email") =>
  z.string().trim().toLowerCase().pipe(z.email(message));

// Compares against the stored column case-insensitively too, so accounts
// and invites saved with capitals before emails were normalised still
// match (and can't be invited or registered a second time). `email` must
// already be lowercase -- it is, when it came through emailField.
export const emailMatches = (column: AnyColumn, email: string) =>
  eq(sql`lower(${column})`, email.toLowerCase());
