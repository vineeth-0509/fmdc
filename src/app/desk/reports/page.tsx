import { prisma } from "@/lib/db";
import { ReportsPanel } from "@/components/ReportsPanel";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const shops = await prisma.retailer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <ReportsPanel shops={shops} />;
}
