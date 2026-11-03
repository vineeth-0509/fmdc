"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ErrorNote } from "@/components/ui";

type Step = "phone" | "code";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? "Something went wrong. Please try again.");
  return data;
}

export function LoginForm({ demoHints }: { demoHints: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{10}$/.test(phone)) return setError("Enter your 10-digit mobile number.");
    setLoading(true);
    try {
      const data = await post("/api/auth/otp/send", { phone });
      setDemoCode(typeof data.demoCode === "string" ? data.demoCode : null);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code.");
    setLoading(true);
    try {
      const data = await post("/api/auth/otp/verify", { phone, code });
      router.replace(data.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-semibold tracking-tight">{step === "phone" ? "Sign in" : "Enter the code"}</h2>
      <p className="mt-1 text-sm text-ink-2">
        {step === "phone"
          ? "Use the mobile number registered with Company A."
          : `We sent a 6-digit code to ${phone.slice(0, 5)} ${phone.slice(5)}.`}
      </p>

      {step === "phone" ? (
        <form onSubmit={sendCode} className="mt-6 space-y-4" noValidate>
          <label className="block text-sm font-semibold" htmlFor="phone">
            Mobile number
          </label>
          <input
            id="phone"
            className="field"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            placeholder="10-digit number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          {error && <ErrorNote message={error} />}
          <Button type="submit" className="w-full" loading={loading}>
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4" noValidate>
          <label className="block text-sm font-semibold" htmlFor="code">
            6-digit code
          </label>
          <input
            id="code"
            className="field text-center text-xl tracking-[0.4em]"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="······"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          {demoCode && (
            <p className="rounded-xl bg-turmeric-soft px-4 py-3 text-sm text-amber">
              Demo mode is on. Use code <strong className="tabular-nums">{demoCode}</strong>.
            </p>
          )}
          {error && <ErrorNote message={error} />}
          <Button type="submit" className="w-full" loading={loading}>
            Verify and continue
          </Button>
          <button
            type="button"
            className="min-h-[44px] w-full text-sm font-semibold text-ink-2 underline underline-offset-2"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
          >
            Use a different number
          </button>
        </form>
      )}

      {demoHints && step === "phone" && (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-4">
          <p className="text-sm font-semibold">Demo accounts</p>
          <div className="mt-3 grid gap-2">
            <button type="button" className="btn btn-secondary btn-sm justify-between" onClick={() => setPhone("9000000001")}>
              <span>Retailer · Sharma General Store</span>
              <span className="tabular-nums text-ink-3">9000000001</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm justify-between" onClick={() => setPhone("9000000099")}>
              <span>Order desk</span>
              <span className="tabular-nums text-ink-3">9000000099</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
