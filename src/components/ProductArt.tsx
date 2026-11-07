"use client";

import { useState, type ReactNode } from "react";
import { CATEGORY_EN, categoryOf, packInfo, type CategoryCode } from "@/lib/category";

/**
 * Product pictures. By default each product is drawn as a printed pack (no downloads, loads instantly).
 * To use real photos, put files at /public/products/<SKU code>.webp (or .png / .jpg) and set NEXT_PUBLIC_PRODUCT_PHOTOS=true;
 * any product without a photo falls back to the drawn pack.
 */
const PHOTOS = process.env.NEXT_PUBLIC_PRODUCT_PHOTOS === "true";
const EXTENSIONS = ["webp", "png", "jpg"];

const TINT: Record<CategoryCode, [string, string]> = {
  BS: ["#FFF3DC", "#FBE0AE"],
  DT: ["#E6F2FB", "#C6E0F4"],
  TE: ["#E4F6EB", "#C4E9D1"],
  DS: ["#F3F8DA", "#DDEBA6"],
  FL: ["#E8EBFB", "#CBD2F4"],
  NS: ["#FEEBDF", "#F8CDB3"],
  SP: ["#FCE6EE", "#F5C6D9"],
  OTHER: ["#EEF2EF", "#DCE4DF"],
};

function splitTitle(title: string): string[] {
  const t = title.toUpperCase();
  if (t.length <= 12) return [t];
  const words = t.split(" ");
  if (words.length === 1) return [t];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    if (Math.abs(a - b) < bestDiff) {
      bestDiff = Math.abs(a - b);
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function LabelText({ cx, top, h, title, weight, ink }: { cx: number; top: number; h: number; title: string; weight: string; ink: string }) {
  const lines = splitTitle(title);
  const total = lines.length * 14 + (weight ? 24 : 0);
  const y0 = top + (h - total) / 2 + 11;
  return (
    <g fontFamily="inherit" textAnchor="middle">
      {lines.map((l, i) => (
        <text key={i} x={cx} y={y0 + i * 14} fontSize="12" fontWeight="700" fill={ink} letterSpacing="0.4">
          {l}
        </text>
      ))}
      {weight && (
        <text x={cx} y={y0 + lines.length * 14 + 15} fontSize="17" fontWeight="800" fill={ink}>
          {weight}
        </text>
      )}
    </g>
  );
}

function Pouch({ id, c1, c2, c3, band, label, ink, children, title, weight }: { id: string; c1: string; c2: string; c3: string; band: string; label: string; ink: string; children: ReactNode; title: string; weight: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.55" stopColor={c2} />
          <stop offset="1" stopColor={c3} />
        </linearGradient>
      </defs>
      <rect x="46" y="14" width="108" height="168" rx="8" fill={`url(#${id})`} />
      <rect x="46" y="14" width="108" height="14" rx="6" fill={band} />
      <rect x="46" y="168" width="108" height="14" rx="6" fill={band} />
      {Array.from({ length: 10 }, (_, i) => (
        <g key={i} stroke="#000" strokeOpacity="0.22" strokeWidth="1.2">
          <line x1={53 + i * 10.4} y1="16" x2={53 + i * 10.4} y2="26" />
          <line x1={53 + i * 10.4} y1="170" x2={53 + i * 10.4} y2="180" />
        </g>
      ))}
      <rect x="56" y="64" width="88" height="62" rx="10" fill={label} />
      <LabelText cx={100} top={64} h={62} title={title} weight={weight} ink={ink} />
      {children}
      <rect x="54" y="32" width="9" height="132" rx="4.5" fill="#fff" opacity="0.18" />
    </>
  );
}

function Art({ cat, title, weight }: { cat: CategoryCode; title: string; weight: string }) {
  switch (cat) {
    case "BS":
      return (
        <Pouch id="gBS" c1="#F4B552" c2="#E48F2A" c3="#C97716" band="#B86A12" label="#FFF8EA" ink="#7A430A" title={title} weight={weight}>
          {[78, 102, 126].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy={148 - (i % 2) * 2} r="11" fill="#F7D894" stroke="#D9A441" strokeWidth="1.5" />
              <circle cx={x - 3} cy={145 - (i % 2) * 2} r="1.6" fill="#B8801F" />
              <circle cx={x + 3} cy={150 - (i % 2) * 2} r="1.6" fill="#B8801F" />
            </g>
          ))}
        </Pouch>
      );
    case "NS":
      return (
        <Pouch id="gNS" c1="#F29A5B" c2="#E17A3A" c3="#C45620" band="#A9481A" label="#FFF6EC" ink="#8A3510" title={title} weight={weight}>
          {[76, 100, 124].map((x) => (
            <path key={x} d={`M${x - 10} 154 l10 -16 l10 16z`} fill="#F8CF96" stroke="#D78C3E" strokeWidth="1.5" />
          ))}
        </Pouch>
      );
    case "DT":
      return (
        <>
          <defs>
            <linearGradient id="gDT" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#4A9BD8" />
              <stop offset="1" stopColor="#1F5F96" />
            </linearGradient>
          </defs>
          <rect x="42" y="26" width="116" height="156" rx="9" fill="url(#gDT)" />
          <rect x="42" y="26" width="116" height="30" rx="9" fill="#17497A" />
          <circle cx="66" cy="42" r="7" fill="#fff" opacity="0.55" />
          <circle cx="86" cy="36" r="4" fill="#fff" opacity="0.5" />
          <circle cx="138" cy="44" r="9" fill="#fff" opacity="0.45" />
          <rect x="54" y="72" width="92" height="82" rx="10" fill="#fff" />
          <LabelText cx={100} top={72} h={82} title={title} weight={weight} ink="#17497A" />
          <rect x="50" y="62" width="9" height="112" rx="4.5" fill="#fff" opacity="0.16" />
        </>
      );
    case "TE":
      return (
        <>
          <defs>
            <linearGradient id="gTE" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3DAA72" />
              <stop offset="1" stopColor="#1B6B45" />
            </linearGradient>
          </defs>
          <rect x="46" y="18" width="108" height="164" rx="8" fill="url(#gTE)" />
          <rect x="46" y="18" width="108" height="12" rx="6" fill="#145236" />
          <path d="M100 44c-19 11-23 36 0 52 23-16 19-41 0-52z" fill="#D9F2E2" />
          <path d="M100 52v40" stroke="#2E8B57" strokeWidth="2" strokeLinecap="round" />
          <rect x="56" y="108" width="88" height="62" rx="9" fill="#FFF9EC" />
          <LabelText cx={100} top={108} h={62} title={title} weight={weight} ink="#14553A" />
          <rect x="54" y="34" width="9" height="130" rx="4.5" fill="#fff" opacity="0.18" />
        </>
      );
    case "DS":
      return (
        <>
          <defs>
            <linearGradient id="gDS" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#B7D645" />
              <stop offset="1" stopColor="#86AD22" />
            </linearGradient>
          </defs>
          <path d="M30 100 L12 86 V114 Z" fill="#7FA81F" />
          <path d="M170 100 L188 86 V114 Z" fill="#7FA81F" />
          <rect x="28" y="56" width="144" height="88" rx="26" fill="url(#gDS)" />
          <path d="M40 70c10-8 20 8 30 0s20 8 30 0 20 8 30 0 20 8 28 0" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="52" y="82" width="96" height="48" rx="11" fill="#fff" />
          <LabelText cx={100} top={82} h={48} title={title} weight={weight} ink="#4E6A0E" />
        </>
      );
    case "FL":
      return (
        <>
          <defs>
            <linearGradient id="gFL" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7C89DE" />
              <stop offset="1" stopColor="#434FA6" />
            </linearGradient>
          </defs>
          <rect x="82" y="10" width="36" height="24" rx="6" fill="#2A3585" />
          <rect x="88" y="32" width="24" height="14" fill="#5360C0" />
          <path d="M68 48h64q14 6 14 22v102q0 10-12 10H66q-12 0-12-10V70q0-16 14-22z" fill="url(#gFL)" />
          <rect x="62" y="86" width="76" height="74" rx="9" fill="#fff" />
          <LabelText cx={100} top={86} h={74} title={title} weight={weight} ink="#2F3A8F" />
          <rect x="60" y="56" width="8" height="110" rx="4" fill="#fff" opacity="0.2" />
        </>
      );
    case "SP":
      return (
        <>
          <defs>
            <linearGradient id="gSP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#E077A0" />
              <stop offset="1" stopColor="#B24D77" />
            </linearGradient>
          </defs>
          <rect x="30" y="58" width="140" height="92" rx="20" fill="url(#gSP)" />
          <rect x="30" y="58" width="140" height="22" rx="20" fill="#fff" opacity="0.14" />
          <rect x="50" y="80" width="100" height="52" rx="12" fill="#fff" />
          <LabelText cx={100} top={80} h={52} title={title} weight={weight} ink="#8E2F59" />
        </>
      );
    default:
      return (
        <>
          <rect x="44" y="30" width="112" height="146" rx="10" fill="#8A9A91" />
          <rect x="56" y="70" width="88" height="70" rx="10" fill="#fff" />
          <LabelText cx={100} top={70} h={70} title={title} weight={weight} ink="#2F3B35" />
        </>
      );
  }
}

export function ProductArt({
  code,
  name,
  size,
  className,
}: {
  code: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [ext, setExt] = useState(0);
  const cat = categoryOf(code);
  const info = packInfo(name);
  const title = info.title || CATEGORY_EN[cat];
  const [a, b] = TINT[cat];

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${size ? "rounded-2xl" : "aspect-square w-full"} ${className ?? ""}`}
      style={{ ...(size ? { width: size, height: size } : {}), background: `linear-gradient(160deg, ${a}, ${b})` }}
      aria-hidden
    >
      {PHOTOS && !photoFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/products/${code}.${EXTENSIONS[ext]}`}
          alt=""
          className="h-full w-full object-contain p-2"
          loading="lazy"
          decoding="async"
          onError={() => (ext < EXTENSIONS.length - 1 ? setExt(ext + 1) : setPhotoFailed(true))}
        />
      ) : (
        <svg viewBox="0 0 200 200" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <ellipse cx="100" cy="190" rx="58" ry="6" fill="#000" opacity="0.12" />
          <Art cat={cat} title={title} weight={info.weight} />
        </svg>
      )}
    </div>
  );
}
