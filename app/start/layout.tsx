import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Kreator profilu" };

export default async function StartLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="mx-auto w-full max-w-4xl px-4 py-6 lg:py-10">{children}</div>;
}
