import { LayoutDashboard, Compass, ListChecks, Send, Radar, BarChart3, FileText, Files, Settings, CalendarClock, FolderOpen } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

// Single source of truth for the app's primary destinations — shared by the
// desktop sidebar and the mobile nav so they can never drift.
export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  chip?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Heute", icon: LayoutDashboard },
  { href: "/explore", label: "Explorer", icon: Compass, chip: "Neu" },
  { href: "/scheduled-scans", label: "Geplante Scans", icon: CalendarClock },
  { href: "/pipeline", label: "Pipeline", icon: ListChecks },
  { href: "/followups", label: "Nachfassen", icon: Send },
  { href: "/portals", label: "Portale", icon: Radar },
  { href: "/analytics", label: "Auswertung", icon: BarChart3 },
  { href: "/cv", label: "Lebenslauf", icon: FileText },
  { href: "/documents", label: "Dokumente", icon: Files },
  { href: "/output", label: "Vorbereitung", icon: FolderOpen },
  { href: "/config", label: "Einstellungen", icon: Settings },
];

export function visibleNavItems(followupsEnabled: boolean): NavItem[] {
  return followupsEnabled ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.href !== "/followups");
}

export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
