"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarPlus,
  FileSignature,
  Phone,
  Plus,
  TrendingDown,
  TrendingUp,
  UserPlus,
  X,
} from "lucide-react";

import { CashForm, Result, SmartForm, Submit, TaskForm, control } from "@/components/layout/quick-forms";
import { addContract, addDeal, addSalesActivity, addWater, type QuickState } from "@/lib/actions/quick";
import { cn } from "@/lib/utils";

/**
 * Kontekstowy przycisk „Dodaj" w górnym pasku: na każdej głównej kategorii
 * dodaje to, co jest jej sednem — na Sprzedaży rozmowy, spotkania i umowy,
 * na Finansach koszt lub zysk, na Zadaniach zadanie, na Zdrowiu wodę.
 * Kategorie, których pozycje dodaje się w edytorze ustawień, dostają link.
 */

type PanelId = "finanse" | "sprzedaz" | "zadanie" | "woda";

type HeaderAction = { prefix: string; label: string } & ({ panel: PanelId } | { href: string });

const ACTIONS: HeaderAction[] = [
  { prefix: "/finanse", label: "Dodaj koszt lub zysk", panel: "finanse" },
  { prefix: "/sprzedaz", label: "Dodaj sprzedaż", panel: "sprzedaz" },
  { prefix: "/zadania", label: "Dodaj zadanie", panel: "zadanie" },
  { prefix: "/zdrowie", label: "Dodaj wodę", panel: "woda" },
  { prefix: "/trening", label: "Dodaj trening", href: "/ustawienia/trening" },
  { prefix: "/nauka", label: "Dodaj naukę", href: "/ustawienia/nauka" },
  { prefix: "/rodzina", label: "Dodaj datę", href: "/ustawienia/rodzina" },
  { prefix: "/projekty", label: "Dodaj projekt", href: "/ustawienia/projekty" },
];

function matchAction(pathname: string): HeaderAction | null {
  return (
    ACTIONS.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) ?? null
  );
}

const headerButton =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-series-1 px-3 text-sm font-medium text-white hover:brightness-110";

/** Zielone potwierdzenie w stylu Result — dla akcji zakończonych poza formularzem. */
function Banner({ text }: { text: string | null }) {
  if (!text) return null;
  return <Result state={{ ok: text }} />;
}

/* ---------------------------------------------------------------- sprzedaż */

function InstantButton({ icon: Icon, label }: { icon: typeof Phone; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center gap-2 rounded-lg border border-edge px-2.5 py-2 text-left text-sm text-ink hover:bg-surface-2 disabled:opacity-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-series-1" />
      {pending ? "Zapisywanie…" : label}
    </button>
  );
}

function SalesPanel({ currency }: { currency: string }) {
  const [state, formAction] = useActionState<QuickState, FormData>(addSalesActivity, undefined);
  const [contractState, contractAction] = useActionState<QuickState, FormData>(addContract, undefined);
  const [dealState, dealAction] = useActionState<QuickState, FormData>(addDeal, undefined);
  const [showContract, setShowContract] = useState(false);
  const [showDeal, setShowDeal] = useState(false);
  const [contractKey, setContractKey] = useState(0);
  const [dealKey, setDealKey] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok) setBanner(state.ok);
  }, [state]);

  useEffect(() => {
    if (contractState?.ok) {
      setBanner(contractState.ok);
      setShowContract(false);
      setContractKey((key) => key + 1);
    }
  }, [contractState]);

  useEffect(() => {
    if (dealState?.ok) {
      setBanner(dealState.ok);
      setShowDeal(false);
      setDealKey((key) => key + 1);
    }
  }, [dealState]);

  const liczniki = [
    { name: "calls", icon: Phone, label: "+1 rozmowa" },
    { name: "scheduled", icon: CalendarPlus, label: "+1 spotkanie umówione" },
    { name: "held", icon: CalendarCheck2, label: "+1 spotkanie odbyte" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <Banner text={banner} />
      {liczniki.map((entry) => (
        <form key={entry.name} action={formAction}>
          <input type="hidden" name={entry.name} value="1" />
          <InstantButton icon={entry.icon} label={entry.label} />
        </form>
      ))}

      {showContract ? (
        <div key={contractKey} className="flex flex-col gap-2 border-t border-line pt-2">
          {contractState?.error ? <Result state={contractState} /> : null}
          <form action={contractAction} className="flex flex-col gap-2">
            <input
              name="clientName"
              type="text"
              autoFocus
              required
              placeholder="Klient"
              aria-label="Nazwa klienta"
              className={control}
            />
            <input
              name="valuePln"
              type="text"
              inputMode="decimal"
              required
              placeholder={`Wartość (${currency})`}
              aria-label="Wartość umowy"
              className={cn(control, "tabular")}
            />
            <select name="status" aria-label="Status umowy" className={control} defaultValue="podpisana">
              <option value="podpisana">Podpisana</option>
              <option value="negocjacje">W negocjacjach</option>
            </select>
            <Submit label="Zapisz umowę" />
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setBanner(null);
            setShowContract(true);
            setShowDeal(false);
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-edge px-2.5 py-2 text-left text-sm text-ink hover:bg-surface-2"
        >
          <FileSignature className="h-4 w-4 shrink-0 text-series-2" />
          Dodaj umowę
        </button>
      )}

      {showDeal ? (
        <div key={dealKey} className="flex flex-col gap-2 border-t border-line pt-2">
          {dealState?.error ? <Result state={dealState} /> : null}
          <form action={dealAction} className="flex flex-col gap-2">
            <input
              name="clientName"
              type="text"
              autoFocus
              required
              placeholder="Potencjalny klient"
              aria-label="Nazwa potencjalnego klienta"
              className={control}
            />
            <input
              name="valuePln"
              type="text"
              inputMode="decimal"
              placeholder={`Szacowana kwota (${currency})`}
              aria-label="Szacowana kwota"
              className={cn(control, "tabular")}
            />
            <select name="probability" aria-label="Szansa wygranej" className={control} defaultValue="">
              <option value="">Szansa: licz średnią</option>
              <option value="20">Szansa 20%</option>
              <option value="50">Szansa 50%</option>
              <option value="80">Szansa 80%</option>
              <option value="100">Szansa 100%</option>
            </select>
            <Submit label="Dodaj do lejka" />
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setBanner(null);
            setShowDeal(true);
            setShowContract(false);
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-edge px-2.5 py-2 text-left text-sm text-ink hover:bg-surface-2"
        >
          <UserPlus className="h-4 w-4 shrink-0 text-series-3" />
          Dodaj potencjalnego klienta
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- woda */

function WaterPanel() {
  const [banner, setBanner] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Banner text={banner} />
      <div className="flex gap-2">
        {[250, 500, 750].map((amount) => (
          <form key={amount} action={addWater} onSubmit={() => setBanner(`Dopisano ${amount} ml do dziś.`)}>
            <input type="hidden" name="amount" value={amount} />
            <button
              type="submit"
              className="rounded-lg border border-edge px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2"
            >
              +{amount} ml
            </button>
          </form>
        ))}
      </div>
      <p className="text-xs text-muted">Dopisuje się do dzisiejszego nawodnienia.</p>
    </div>
  );
}

/* ----------------------------------------------------------------- finanse */

function FinancePanel({ onSaved }: { onSaved: (komunikat: string) => void }) {
  const [kind, setKind] = useState<"koszt" | "zysk" | null>(null);

  if (kind !== null) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setKind(null)}
          className="flex items-center gap-1.5 self-start text-xs text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Wróć
        </button>
        <CashForm kind={kind} onSaved={onSaved} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setKind("koszt")}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
      >
        <TrendingDown className="h-4 w-4 shrink-0 text-critical" />
        <span className="text-sm text-ink">Dodaj koszt</span>
      </button>
      <button
        type="button"
        onClick={() => setKind("zysk")}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
      >
        <TrendingUp className="h-4 w-4 shrink-0 text-[var(--delta-up)]" />
        <span className="text-sm text-ink">Dodaj zysk</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ całość */

export function HeaderAdd({ currency }: { currency: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const action = matchAction(pathname);

  // Zmiana kategorii zamyka panel — przycisk i tak zmienia znaczenie.
  useEffect(() => {
    setOpen(false);
    setBanner(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Po zapisie z formularza: potwierdzenie na górze panelu i czysty formularz.
  const poZapisie = useCallback((komunikat: string) => {
    setBanner(komunikat);
    setFormKey((key) => key + 1);
  }, []);

  if (action && "href" in action) {
    return (
      <Link href={action.href} className={headerButton}>
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">{action.label}</span>
      </Link>
    );
  }

  // Ścieżki bez dedykowanego panelu (pulpit, kalendarz, mentor…) dostają
  // uniwersalny „Szybki wpis" — jedno zdanie zamiast wyboru formularza.
  const label = action ? action.label : "Szybki wpis";

  return (
    <div className="relative">
      {open ? (
        <button
          type="button"
          aria-label="Zamknij dodawanie"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/40"
        />
      ) : null}

      <button
        type="button"
        onClick={() => {
          setBanner(null);
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-label={label}
        className={cn(headerButton, "relative z-50")}
      >
        <Plus className={cn("h-4 w-4 transition-transform", open && "rotate-45")} />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open ? (
        // Na telefonie panel rozpina się na szerokość ekranu (fixed), bo zakotwiczony
        // przy przycisku wystawałby poza lewą krawędź; od sm wraca pod przycisk.
        <div className="fixed inset-x-4 top-16 z-50 rounded-xl border border-edge bg-surface p-3 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[min(320px,calc(100vw-2rem))]">
          <div className="mb-2 flex items-center gap-2">
            <p className="flex-1 text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Zamknij"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div key={formKey} className="flex flex-col gap-2">
            <Banner text={banner} />
            {action?.panel === "finanse" ? <FinancePanel onSaved={poZapisie} /> : null}
            {action?.panel === "sprzedaz" ? <SalesPanel currency={currency} /> : null}
            {action?.panel === "zadanie" ? <TaskForm onSaved={poZapisie} /> : null}
            {action?.panel === "woda" ? <WaterPanel /> : null}
            {!action ? <SmartForm onSaved={poZapisie} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
