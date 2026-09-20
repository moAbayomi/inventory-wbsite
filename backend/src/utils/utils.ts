import { SignJWT, type JWTPayload, jwtVerify } from "jose";
import { env } from "../../env.ts";
import crypto from "node:crypto";
import bcrypt from "bcrypt";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface PastryTokenJWTPayload extends JWTPayload {
	sub: string;
	role: string;
}

export async function generateAccessToken(
	payload: PastryTokenJWTPayload,
): Promise<string> {
	return await new SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(secret);
}

export function generateRefreshToken(): string {
	return crypto.randomBytes(32).toString("hex");
}


export function generateRandomToken(): string {
	return crypto.randomBytes(48).toString("hex");
}

export function hashToken(plainText: string): string {
	return crypto.createHash("sha256").update(plainText).digest("hex");
}

export async function hashPassword(plainPassword: string): Promise<string> {
	return bcrypt.hash(plainPassword, env.BCRYPT_ROUNDS);
}

export async function comparePassword(
	plainPassword: string,
	hashedPassword: string,
) {
	return bcrypt.compare(plainPassword, hashedPassword);
}

export async function verifyToken(
	token: string,
): Promise<PastryTokenJWTPayload> {
	const secret = new TextEncoder().encode(env.JWT_SECRET);
	const { payload } = await jwtVerify(token, secret);
	return payload as PastryTokenJWTPayload;
}
