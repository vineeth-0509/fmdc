import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { CartProvider } from "@/components/cart";
import { RetailerShell } from "@/components/RetailerShell";

export default async function RetailerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "RETAILER" || !session.retailerId) redirect("/login");
  const retailer = await prisma.retailer.findUnique({
    where: { id: session.retailerId },
    select: { name: true },
  });
  if (!retailer) redirect("/login");

  return (
    <CartProvider>
      <RetailerShell retailerName={retailer.name}>{children}</RetailerShell>
    </CartProvider>
  );
}
