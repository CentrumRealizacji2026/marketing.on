"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Menu, PanelRightClose, PanelRightOpen, X } from "lucide-react";

import { DASHBOARD_NAV, NAV, type NavCategory } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  const base = href.split("#")[0];
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}

function CategoryGroup({
  category,
  pathname,
  collapsed,
  onNavigate,
}: {
  category: NavCategory;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, category.href);
  const Icon = category.icon;

  if (collapsed) {
    return (
      <Link
        href={category.href}
        title={category.label}
        aria-label={category.label}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          active ? "bg-series-1/15 text-series-1" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </Link>
    );
  }

  return (
    // Rozwijanie oparte na <details> — działa bez JS i jest dostępne z klawiatury.
    <details open={active} className="group">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2.5 rounded-lg pr-2.5 text-sm transition-colors",
          active ? "bg-series-1/15 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        {/*
          Nazwa kategorii prowadzi na jej stronę, a strzałka rozwija podkategorie.
          stopPropagation trzyma te dwie rzeczy osobno: kliknięcie w nazwę nie
          zwija właśnie otwieranej kategorii.
        */}
        <Link
          href={category.href}
          onClick={(event) => {
            event.stopPropagation();
            onNavigate?.();
          }}
          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2.5"
        >
          <Icon className={cn("h-4 w-4 shrink-0", active ? "text-series-1" : "text-muted")} />
          <span className="truncate">{category.label}</span>
        </Link>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>

      <ul className="mt-0.5 mb-1 ml-[1.55rem] flex flex-col gap-px border-l border-line pl-2.5">
        {category.items.map((item) => {
          const itemActive = pathname === item.href.split("#")[0] && item.href.includes("/ustawienia");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-xs transition-colors",
                  itemActive ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function RailContent({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const DashIcon = DASHBOARD_NAV.icon;
  const dashActive = pathname === "/";

  return (
    <nav aria-label="Kategorie" className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
      <Link
        href={DASHBOARD_NAV.href}
        onClick={onNavigate}
        title={collapsed ? DASHBOARD_NAV.label : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg text-sm transition-colors",
          collapsed ? "h-10 w-10 justify-center" : "px-2.5 py-2",
          dashActive ? "bg-series-1/15 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        <DashIcon className={cn("h-4 w-4 shrink-0", dashActive ? "text-series-1" : "text-muted")} />
        {collapsed ? null : <span className="flex-1">{DASHBOARD_NAV.label}</span>}
      </Link>

      <div className={cn("my-1.5 border-t border-line", collapsed ? "w-8" : "w-full")} />

      {NAV.map((category) => (
        <CategoryGroup
          key={category.key}
          category={category}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

export function CategoryRail() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop: stały pasek po prawej stronie. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-l border-edge bg-surface transition-[width] lg:flex",
          collapsed ? "w-16" : "w-[268px]",
        )}
      >
        <div className={cn("flex items-center gap-2 px-3 py-3", collapsed ? "justify-center" : "justify-between")}>
          {collapsed ? null : <span className="px-1 text-xs font-semibold tracking-wide text-muted">KATEGORIE</span>}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Rozwiń pasek kategorii" : "Zwiń pasek kategorii"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          >
            {collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2.5 pb-4">
          <RailContent pathname={pathname} collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile: przycisk otwierający panel wysuwany z prawej. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Otwórz kategorie"
        className="fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-edge bg-surface text-ink shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Zamknij kategorie"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute inset-y-0 right-0 flex w-[280px] max-w-[85vw] flex-col border-l border-edge bg-surface">
            <div className="flex items-center justify-between px-3 py-3">
              <span className="px-1 text-xs font-semibold tracking-wide text-muted">KATEGORIE</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Zamknij"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2.5 pb-6">
              <RailContent pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
