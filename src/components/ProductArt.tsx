/** Small flat illustrations so the catalogue has large, light images with no downloads. */
const TINT: Record<string, string> = {
  BS: "#F6EAD0",
  DT: "#DCE9F2",
  TE: "#DDEBDD",
  DS: "#EEF1CF",
  FL: "#E3E6F4",
  NS: "#F7E0D2",
  SP: "#F3DDE6",
};

function Art({ cat }: { cat: string }) {
  switch (cat) {
    case "BS":
      return (
        <>
          <rect x="22" y="12" width="52" height="72" rx="9" fill="#D9A441" />
          <rect x="22" y="12" width="52" height="13" rx="6" fill="#B7791F" />
          <circle cx="48" cy="55" r="17" fill="#F7E4B8" />
          <circle cx="42" cy="49" r="2.2" fill="#B7791F" />
          <circle cx="53" cy="52" r="2.2" fill="#B7791F" />
          <circle cx="47" cy="61" r="2.2" fill="#B7791F" />
        </>
      );
    case "DT":
      return (
        <>
          <rect x="18" y="22" width="60" height="62" rx="7" fill="#2F6F9F" />
          <rect x="18" y="22" width="60" height="14" rx="7" fill="#1F4E75" />
          <circle cx="48" cy="60" r="15" fill="#fff" opacity="0.92" />
          <circle cx="40" cy="46" r="4" fill="#9CC7E6" />
          <circle cx="57" cy="44" r="3" fill="#9CC7E6" />
        </>
      );
    case "TE":
      return (
        <>
          <rect x="22" y="14" width="52" height="70" rx="9" fill="#2E7D4F" />
          <rect x="22" y="14" width="52" height="12" rx="6" fill="#1E5A37" />
          <path d="M48 72C33 62 35 44 48 36c13 8 15 26 0 36z" fill="#CFE8D6" />
          <path d="M48 70V42" stroke="#2E7D4F" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "DS":
      return (
        <>
          <rect x="16" y="34" width="64" height="34" rx="12" fill="#9BB62F" />
          <path d="M26 52c6-6 10 6 16 0s10 6 16 0 8 4 12 0" stroke="#F4F8D8" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "FL":
      return (
        <>
          <rect x="38" y="10" width="20" height="14" rx="4" fill="#3F4FA0" />
          <path d="M34 28h28l6 14v40a4 4 0 01-4 4H32a4 4 0 01-4-4V42z" fill="#6573C8" />
          <rect x="34" y="50" width="28" height="20" rx="4" fill="#E3E6F4" />
        </>
      );
    case "NS":
      return (
        <>
          <path d="M22 18h52l-3 66H25z" fill="#D9703B" />
          <path d="M22 18c5 5 9-5 14 0s9-5 14 0 9-5 14 0 6-3 10 0" stroke="#A9501F" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="48" cy="55" r="13" fill="#F7E0D2" />
        </>
      );
    case "SP":
      return (
        <>
          <rect x="16" y="32" width="64" height="38" rx="16" fill="#C9648C" />
          <rect x="28" y="42" width="40" height="18" rx="9" fill="#F3DDE6" />
        </>
      );
    default:
      return <rect x="22" y="22" width="52" height="52" rx="9" fill="#8A948E" />;
  }
}

export function ProductArt({ code, size = 84, className }: { code: string; size?: number; className?: string }) {
  const cat = (code.split("-")[1] ?? "").toUpperCase();
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-2xl ${className ?? ""}`}
      style={{ width: size, height: size, background: TINT[cat] ?? "#E9ECE6" }}
      aria-hidden
    >
      <svg viewBox="0 0 96 96" width={size * 0.8} height={size * 0.8}>
        <Art cat={cat} />
      </svg>
    </div>
  );
}
