import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "mtk-news-super-secret-jwt-key-change-in-production-min-32-chars";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const ROLES = {
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  AUTHOR: "AUTHOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Retrieves the authenticated user from cookies or Authorization header.
 */
export async function getSessionUser(req?: NextRequest): Promise<TokenPayload | null> {
  let token: string | undefined;

  // 1. Check Authorization header
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
    // 2. Check req.cookies directly
    if (!token) {
      token = req.cookies.get("mtk_token")?.value;
    }
  }

  // 3. Fallback to cookies() store
  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get("mtk_token")?.value;
    } catch {
      // Cookies might fail if outside Next.js request context
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return payload;
}

/**
 * Checks whether user has sufficient permission based on hierarchy:
 * ADMIN > EDITOR > AUTHOR
 */
export function checkPermission(userRole: Role | string, requiredRole: Role): boolean {
  const hierarchy: Record<string, number> = {
    [ROLES.AUTHOR]: 1,
    [ROLES.EDITOR]: 2,
    [ROLES.ADMIN]: 3,
  };

  const currentLevel = hierarchy[userRole] || 0;
  const requiredLevel = hierarchy[requiredRole] || 0;

  return currentLevel >= requiredLevel;
}
