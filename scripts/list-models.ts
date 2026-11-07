/**
 * Lists the Gemini models your API key can use, so you can pick a valid LLM_MODEL.
 * Run: npm run ai:models
 */
type ModelInfo = { name: string; displayName?: string; supportedGenerationMethods?: string[] };

async function main() {
  const key = process.env.LLM_API_KEY?.trim();
  if (!key) {
    console.error("LLM_API_KEY is not set in .env");
    process.exit(1);
  }
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": key },
  });
  if (!res.ok) {
    console.error(`Google returned ${res.status}:`, (await res.text()).slice(0, 400));
    process.exit(1);
  }
  const data = (await res.json()) as { models?: ModelInfo[] };
  const usable = (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => n.startsWith("gemini"));

  const images = (data.models ?? [])
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => n.includes("image") && n.startsWith("gemini"));
  const flash = usable.filter((n) => n.includes("flash") && !n.includes("image"));
  console.log("Models that work with generateContent (copy one into LLM_MODEL):\n");
  for (const n of flash.length ? flash : usable) console.log("  " + n);
  console.log(`\nCurrent LLM_MODEL: ${process.env.LLM_MODEL ?? "(not set)"}`);
  if (images.length) {
    console.log("\nImage models (optional, for `npm run ai:images`, set as IMAGE_MODEL):\n");
    for (const n of images) console.log("  " + n);
  }
}

main();
