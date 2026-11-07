import { getSession } from "@/lib/auth/session";
import { getCatalogue } from "@/server/catalogue";
import { CaptureView } from "@/components/CaptureView";
import { aiConfigured } from "@/server/capture/service";
import type { SkuOption } from "@/lib/capture-types";

export const metadata = { title: "Order by message" };

export default async function CapturePage() {
  const session = await getSession();
  const items = await getCatalogue(session!.retailerId as string);
  const options: SkuOption[] = items.map((i) => ({
    id: i.id,
    code: i.code,
    name: i.name,
    nameHi: i.nameHi,
    stockCases: i.stockCases,
    piecesPerCase: i.piecesPerCase,
  }));
  const aiOn = aiConfigured();
  return <CaptureView catalogue={options} aiOn={aiOn} />;
}
