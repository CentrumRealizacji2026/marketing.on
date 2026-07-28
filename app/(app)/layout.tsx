import Link from "next/link";
import { ClipboardList, LogOut } from "lucide-react";

import { CategoryRail } from "@/components/layout/category-rail";
import { Clock } from "@/components/layout/clock";
import { QuickAdd } from "@/components/layout/quick-add";
import { PwaRegister } from "@/components/pwa-register";
import { logout } from "@/lib/auth/actions";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { formatFullDatePl, todayInTz } from "@/lib/domain/dates";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);

  return (
    <div className="flex min-h-dvh">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-edge bg-plane/90 px-4 py-3 backdrop-blur lg:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {user.name ? `Cześć, ${user.name}` : "Kokpit"}
            </p>
            <p className="truncate text-xs text-muted">{formatFullDatePl(today)}</p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Clock timezone={settings.timezone} />
            <Link
              href="/raport"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-series-1 px-3 text-sm font-medium text-white hover:brightness-110"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Raport dzienny</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Wyloguj"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* pb-24 na każdej szerokości: pływające przyciski nie mogą zasłaniać końca treści. */}
        <main className="flex-1 px-4 pt-4 pb-24 lg:px-6">{children}</main>
      </div>

      <CategoryRail />
      <QuickAdd />
      <PwaRegister />
    </div>
  );
}
