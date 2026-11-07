import type { CSSProperties } from "react";
import { ProductArt } from "@/components/ProductArt";

/**
 * Animated left panel for the sign-in screen. Pure CSS (see globals.css, "Login hero"): no library, no images.
 * One 12-second story repeats: products float in, fly into the basket, labels show what the app gives you,
 * "Order placed successfully" confirms. Two product sets take turns so each loop looks a little different.
 */

type Tile = { code: string; name: string; sx: number; sy: number; hideOnMobile?: boolean };

const SET_A: Tile[] = [
  { code: "SKU-BS-075", name: "Glucose biscuit 75 g", sx: -170, sy: -46 },
  { code: "SKU-DT-1KG", name: "Detergent powder 1 kg", sx: -58, sy: -92 },
  { code: "SKU-TE-250", name: "Tea leaf 250 g", sx: 58, sy: -76, hideOnMobile: true },
  { code: "SKU-DS-250", name: "Dish wash bar 250 g", sx: 170, sy: -38, hideOnMobile: true },
];

const SET_B: Tile[] = [
  { code: "SKU-NS-200", name: "Salted namkeen 200 g", sx: -164, sy: -62 },
  { code: "SKU-BS-150", name: "Cream biscuit 150 g", sx: -52, sy: -84 },
  { code: "SKU-FL-500", name: "Floor cleaner 500 ml", sx: 56, sy: -96, hideOnMobile: true },
  { code: "SKU-SP-100", name: "Soap bar 100 g", sx: 166, sy: -52, hideOnMobile: true },
];

function TileCard({ tile, set, index }: { tile: Tile; set: "a" | "b"; index: number }) {
  const delay = (set === "b" ? 12 : 0) + index * 0.4;
  const style = {
    "--sx": `${tile.sx}px`,
    "--sy": `${tile.sy}px`,
    animationDelay: `${delay}s`,
  } as CSSProperties;
  return (
    <div className={`hero-tile hero-tile-${set}${tile.hideOnMobile ? " hidden md:block" : ""}`} style={style} aria-hidden>
      <ProductArt code={tile.code} name={tile.name} size={84} />
    </div>
  );
}

function Basket() {
  return (
    <svg viewBox="0 0 120 110" width="104" height="96" aria-hidden>
      <path d="M30 40c0-18 12-28 30-28s30 10 30 28" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="6" strokeLinecap="round" />
      <path d="M12 40h96l-9 52a10 10 0 01-10 8H31a10 10 0 01-10-8z" fill="#fff" />
      <path d="M12 40h96l-2.6 15H14.6z" fill="#DDF3E8" />
      <path d="M40 62v26M60 62v26M80 62v26" stroke="#0F6B4A" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function LoginHero() {
  return (
    <div className="hero-scene-wrap" aria-hidden>
      <div className="hero-scene">
        {SET_A.map((t, i) => (
          <TileCard key={t.code} tile={t} set="a" index={i} />
        ))}
        {SET_B.map((t, i) => (
          <TileCard key={t.code} tile={t} set="b" index={i} />
        ))}

        <div className="hero-cart">
          <div className="hero-cart-bob">
            <div className="hero-cart-pulse">
              <Basket />
            </div>
          </div>
        </div>

        <span className="hero-label" style={{ left: "0%", top: "58%", animationDelay: "1s" }}>
          <i /> Your retailer price
        </span>
        <span className="hero-label" style={{ right: "0%", top: "50%", animationDelay: "2.4s" }}>
          <i /> Today&rsquo;s stock
        </span>
        <span className="hero-label hero-label-3" style={{ left: "4%", top: "82%", animationDelay: "3.8s" }}>
          <i /> Special schemes
        </span>

        <div className="hero-confirm">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <circle cx="12" cy="12" r="11" fill="#16A36A" />
            <path className="hero-check" d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Order placed successfully
        </div>
      </div>
    </div>
  );
}
