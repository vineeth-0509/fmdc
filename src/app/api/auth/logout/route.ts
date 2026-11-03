import { ok, route } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(req: Request) {
  return route(req, async () => {
    await clearSessionCookie();
    return ok({ ok: true });
  });
}
