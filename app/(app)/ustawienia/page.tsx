import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getConfigStatus } from "@/lib/queries/config";
import { pluralPl } from "@/lib/utils";

export const metadata: Metadata = { title: "Ustawienia" };
export const dynamic = "force-dynamic";

export default async function SettingsOverview() {
  const user = await requireOnboardedUser();
  const status = await getConfigStatus(user.id);

  const sections = [
    { href: "/ustawienia/profil", title: "Profil", desc: "Imię, strefa czasowa, waluta, początek tygodnia.", count: null },
    { href: "/ustawienia/cele", title: "Cele i normy", desc: "Cele sprzedażowe, cel wody i progi, waga docelowa.", count: null },
    {
      href: "/ustawienia/oszczednosci",
      title: "Cele oszczędnościowe",
      desc: "Na co odkładasz, ile chcesz uzbierać i do kiedy.",
      count: status.savingsGoals,
    },
    {
      href: "/ustawienia/platnosci",
      title: "Płatności",
      desc: "Rachunki i raty: kwota, termin, rytm i okres zobowiązania.",
      count: status.obligations,
    },
    {
      href: "/ustawienia/rodzina",
      title: "Rodzina",
      desc: "Osoby, daty urodzin, rocznice, randki i wspólne wyjazdy.",
      count: status.familyMembers,
    },
    {
      href: "/ustawienia/odliczanie",
      title: "Odliczanie",
      desc: "Wydarzenia, do których liczysz dni — wakacje, egzamin, termin.",
      count: status.countdowns,
    },
    {
      href: "/ustawienia/leki",
      title: "Leki i suplementy",
      desc: "Nazwy, dawki, pory dnia i dni tygodnia.",
      count: status.medications,
    },
    {
      href: "/ustawienia/trening",
      title: "Plan treningowy",
      desc: "Jednostki treningowe w tygodniu: dyscyplina, dzień, godzina.",
      count: status.trainingPlans,
    },
    {
      href: "/ustawienia/rekordy",
      title: "Rekordy",
      desc: "Dyscypliny, metryki i najlepsze wyniki.",
      count: status.personalRecords,
    },
    {
      href: "/ustawienia/nauka",
      title: "Plan nauki",
      desc: "Bloki tygodniowe i okresy planu rocznego.",
      count: status.learningWeek + status.learningYear,
    },
    { href: "/ustawienia/projekty", title: "Projekty", desc: "Cele, terminy i następne kroki.", count: status.projects },
    {
      href: "/ustawienia/materialy",
      title: "Materiały",
      desc: "Szkolenia, kursy i książki przypisane do dziedzin nauki.",
      count: status.materials,
    },
    { href: "/ustawienia/konto", title: "Konto", desc: "Hasło i ponowne przejście kreatora.", count: null },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => (
        <Link key={section.href} href={section.href} className="group">
          <Card className="h-full transition-colors group-hover:border-series-1/50">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">{section.title}</h2>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted group-hover:text-series-1" />
            </div>
            <p className="mt-1 text-xs text-muted">{section.desc}</p>
            {section.count !== null ? (
              <p className="mt-2 text-xs text-ink-2">
                {section.count === 0
                  ? "Jeszcze nic tu nie ma"
                  : `${section.count} ${pluralPl(section.count, "pozycja", "pozycje", "pozycji")}`}
              </p>
            ) : null}
          </Card>
        </Link>
      ))}
    </div>
  );
}
