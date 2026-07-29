import {
  Activity,
  Brain,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FolderKanban,
  GraduationCap,
  Heart,
  HeartPulse,
  ListTodo,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";

export type NavItem = { label: string; href: string };

export type NavCategory = {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

/**
 * Prawy pasek kategorii. Każda kategoria rozwija się na podkategorie, które
 * prowadzą do sekcji na stronie danej kategorii.
 */
export const NAV: NavCategory[] = [
  {
    key: "kalendarz",
    label: "Kalendarz",
    href: "/kalendarz",
    icon: CalendarDays,
    items: [
      { label: "Miesiąc", href: "/kalendarz" },
      { label: "Wybrany dzień", href: "/kalendarz#dzien" },
    ],
  },
  {
    key: "finanse",
    label: "Finanse",
    href: "/finanse",
    icon: Wallet,
    items: [
      { label: "Stan środków", href: "/finanse#stan" },
      { label: "Przepływy", href: "/finanse#przeplywy" },
      { label: "Oszczędności", href: "/finanse#oszczednosci" },
      { label: "Płatności", href: "/finanse#platnosci" },
      { label: "Na tle świata", href: "/finanse#pozycja" },
      { label: "Kontrakty", href: "/finanse#kontrakty" },
      { label: "Wpływy i wydatki", href: "/finanse#wplywy" },
    ],
  },
  {
    key: "sprzedaz",
    label: "Sprzedaż",
    href: "/sprzedaz",
    icon: TrendingUp,
    items: [
      { label: "Do podpisania", href: "/sprzedaz#do-podpisania" },
      { label: "Rozmowy", href: "/sprzedaz#rozmowy" },
      { label: "Spotkania umówione", href: "/sprzedaz#umowione" },
      { label: "Spotkania odbyte", href: "/sprzedaz#odbyte" },
      { label: "Umowy", href: "/sprzedaz#umowy" },
      { label: "Lejek", href: "/sprzedaz#lejek" },
    ],
  },
  {
    key: "rodzina",
    label: "Rodzina",
    href: "/rodzina",
    icon: Heart,
    items: [
      { label: "Najbliższe daty", href: "/rodzina#daty" },
      { label: "Drobne gesty", href: "/rodzina#gesty" },
      { label: "Osoby i wydarzenia", href: "/rodzina#osoby" },
    ],
  },
  {
    key: "zdrowie",
    label: "Zdrowie",
    href: "/zdrowie",
    icon: HeartPulse,
    items: [
      { label: "Leki", href: "/zdrowie#leki" },
      { label: "Suplementy", href: "/zdrowie#suplementy" },
      { label: "Waga i plan", href: "/zdrowie#waga" },
      { label: "Nawodnienie", href: "/zdrowie#nawodnienie" },
      { label: "Testy psychiczne", href: "/zdrowie#testy" },
      { label: "Puls dnia", href: "/zdrowie#psychika" },
    ],
  },
  {
    key: "zadania",
    label: "Zadania",
    href: "/zadania",
    icon: ListTodo,
    items: [
      { label: "3 priorytety", href: "/zadania#priorytety" },
      { label: "Side questy", href: "/zadania#side" },
      { label: "Zaległe", href: "/zadania#zalegle" },
      { label: "Archiwum", href: "/zadania#archiwum" },
    ],
  },
  {
    key: "trening",
    label: "Trening",
    href: "/trening",
    icon: Dumbbell,
    items: [
      { label: "Plan tygodnia", href: "/trening#plan" },
      { label: "Dziennik", href: "/trening#dziennik" },
      { label: "Rekordy (PR)", href: "/trening#rekordy" },
    ],
  },
  {
    key: "nauka",
    label: "Nauka",
    href: "/nauka",
    icon: GraduationCap,
    items: [
      { label: "Blok dnia", href: "/nauka#dzis" },
      { label: "Plan tygodnia", href: "/nauka#tydzien" },
      { label: "Plan roczny", href: "/nauka#rok" },
      { label: "Materiały", href: "/nauka#materialy" },
    ],
  },
  {
    key: "projekty",
    label: "Projekty",
    href: "/projekty",
    icon: FolderKanban,
    items: [
      { label: "Aktywne", href: "/projekty#aktywne" },
      { label: "Kamienie milowe", href: "/projekty#kamienie" },
      { label: "Backlog", href: "/projekty#backlog" },
    ],
  },
  {
    key: "mentor",
    label: "Mentor AI",
    href: "/mentor",
    icon: Brain,
    items: [
      { label: "Rekomendacje", href: "/mentor#rekomendacje" },
      { label: "Przegląd tygodnia", href: "/tydzien" },
      { label: "Korelacje", href: "/mentor#korelacje" },
      { label: "Cele", href: "/mentor#cele" },
    ],
  },
  {
    key: "raport",
    label: "Raport",
    href: "/raport",
    icon: ClipboardList,
    items: [
      { label: "Raport dzienny", href: "/raport" },
      { label: "Historia raportów", href: "/raport/historia" },
    ],
  },
  {
    key: "ustawienia",
    label: "Ustawienia",
    href: "/ustawienia",
    icon: Settings,
    items: [
      { label: "Profil", href: "/ustawienia/profil" },
      { label: "Cele i normy", href: "/ustawienia/cele" },
      { label: "Leki i suplementy", href: "/ustawienia/leki" },
      { label: "Plan treningowy", href: "/ustawienia/trening" },
      { label: "Rekordy", href: "/ustawienia/rekordy" },
      { label: "Plan nauki", href: "/ustawienia/nauka" },
      { label: "Projekty", href: "/ustawienia/projekty" },
      { label: "Materiały", href: "/ustawienia/materialy" },
      { label: "Powiadomienia", href: "/ustawienia/powiadomienia" },
      { label: "Konto", href: "/ustawienia/konto" },
    ],
  },
];

export const DASHBOARD_NAV = { label: "Dziś", href: "/", icon: Activity };
