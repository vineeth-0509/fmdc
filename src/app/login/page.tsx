import { LoginForm } from "@/components/LoginForm";
import { LoginHero } from "@/components/LoginHero";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] md:grid-cols-2">
      <section className="relative flex flex-col overflow-hidden bg-gradient-to-br from-[#0F6B4A] to-[#0A4F37] px-6 pb-6 pt-8 text-white md:px-12 md:py-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" aria-hidden />

        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-pine" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8h14l-1 12H6z" />
              <path d="M9 8V6.5a3 3 0 016 0V8" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">{BRAND}</span>
        </div>

        <div className="relative mt-8 md:mt-14">
          <h1 className="hero-fade-up max-w-md text-[34px] font-bold leading-[1.08] tracking-tight md:text-[52px]">
            Order in a minute.
          </h1>
          <p className="hero-fade-up-2 mt-3 max-w-sm text-[15px] leading-relaxed text-white/80 md:text-base">
            Your own prices, today&rsquo;s stock and the current schemes, all in one place.
          </p>
        </div>

        <div className="relative mt-4 md:mt-auto md:pt-8">
          <LoginHero />
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 md:px-12">
        <LoginForm demoHints={process.env.NEXT_PUBLIC_DEMO_HINTS === "true"} />
      </section>
    </main>
  );
}
