import { prisma } from "@/lib/db";
import { AppError, ok, readJson, route } from "@/lib/api";
import { otpSendSchema } from "@/lib/validation";
import {
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_SEND_WINDOW_MS,
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  isDemoMode,
} from "@/lib/auth/otp";

export async function POST(req: Request) {
  return route(req, async () => {
    const { phone } = otpSendSchema.parse(await readJson(req));

    const since = new Date(Date.now() - OTP_SEND_WINDOW_MS);
    const recent = await prisma.otpCode.count({ where: { phone, createdAt: { gt: since } } });
    if (recent >= OTP_MAX_SENDS_PER_WINDOW) {
      throw new AppError(429, "RATE_LIMITED", "Too many codes requested. Try again in a few minutes.");
    }

    const code = generateOtp();
    await prisma.otpCode.create({
      data: { phone, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    // SMS delivery is mocked (A8). Outside demo mode the code is written to the server log.
    if (!isDemoMode()) console.log(`[mock-sms] OTP for ${phone}: ${code}`);

    // The same answer whether or not the number has an account.
    // In demo mode only, the code is returned so a reviewer can sign in without an SMS (A8).
    return ok({ ok: true, demo: isDemoMode(), demoCode: isDemoMode() ? code : undefined });
  });
}
