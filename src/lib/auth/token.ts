import { SignJWT, jwtVerify } from "jose";

export type Session = {
  uid: string;
  role: "RETAILER" | "DESK";
  retailerId: string | null;
};

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set to a string of at least 16 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ role: session.role, rid: session.retailerId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.uid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(key());
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const role = payload.role;
    if (typeof payload.sub !== "string") return null;
    if (role !== "RETAILER" && role !== "DESK") return null;
    const rid = typeof payload.rid === "string" ? payload.rid : null;
    return { uid: payload.sub, role, retailerId: rid };
  } catch {
    return null;
  }
}
