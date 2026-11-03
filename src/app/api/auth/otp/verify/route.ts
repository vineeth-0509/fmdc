import { prisma } from "@/lib/db";
import { AppError, ok, readJson, route } from "@/lib/api";
import { otpVerifySchema } from "@/lib/validation";
import { OTP_MAX_ATTEMPTS, otpMatches } from "@/lib/auth/otp";
import { signSession } from "@/lib/auth/token";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(req: Request) {
  return route(req, async () => {
    const { phone, code } = otpVerifySchema.parse(await readJson(req));

    const record = await prisma.otpCode.findFirst({
      where: { phone, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!record || record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError(401, "INVALID_OTP", "This code has expired or been tried too many times. Ask for a new one.");
    }
    if (!otpMatches(phone, code, record.codeHash)) {
      await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw new AppError(401, "INVALID_OTP", "That code is not correct.");
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    await prisma.otpCode.deleteMany({ where: { phone } });
    if (!user) throw new AppError(401, "NO_ACCOUNT", "We could not sign you in with this number.");

    const token = await signSession({ uid: user.id, role: user.role, retailerId: user.retailerId });
    await setSessionCookie(token);
    return ok({ role: user.role, redirect: user.role === "DESK" ? "/desk" : "/retailer" });
  });
}
