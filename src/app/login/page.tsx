import { ProductArt } from "@/components/ProductArt";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] md:grid-cols-2">
      <section className="flex flex-col justify-between bg-pine px-6 pb-8 pt-10 text-white md:px-12 md:py-14">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg font-bold text-pine" aria-hidden>
            A
          </span>
          <span className="text-lg font-semibold">Company A</span>
        </div>
        <div className="mt-10 md:mt-0">
          <h1 className="max-w-sm text-[34px] font-bold leading-[1.1] tracking-tight md:text-5xl">Order in a minute.</h1>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/80">
            Your own prices, today&rsquo;s stock and the current schemes, all in one place.
          </p>
          <div className="mt-8 grid max-w-sm grid-cols-4 gap-3" aria-hidden>
            {["SKU-BS-075", "SKU-DT-1KG", "SKU-TE-250", "SKU-DS-250"].map((c) => (
              <ProductArt key={c} code={c} size={64} className="!h-auto !w-full aspect-square" />
            ))}
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-10 md:px-12">
        <LoginForm demoHints={process.env.NEXT_PUBLIC_DEMO_HINTS === "true"} />
      </section>
    </main>
  );
}
