import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DeskShell } from "@/components/DeskShell";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "DESK") redirect("/login");
  return <DeskShell>{children}</DeskShell>;
}
