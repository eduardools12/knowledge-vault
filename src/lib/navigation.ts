import {
  BoxesIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LibraryBigIcon,
  type LucideIcon,
  NetworkIcon,
  RepeatIcon,
  SearchIcon,
  SettingsIcon,
  TagsIcon,
  BookMarkedIcon,
} from "lucide-react";

import { ROUTES } from "@/lib/routes";

/**
 * The sidebar, defined once and rendered by both the desktop rail and the
 * mobile sheet. Two hand-maintained copies of a navigation menu drift within a
 * week — one of them always ends up missing the newest section.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Marks a section whose page is still a placeholder, so the sidebar tells the
   * truth about what is finished instead of promising screens that are not
   * there yet.
   */
  stage?: string;
};

export type NavGroup = {
  /** `null` for the first group, which needs no heading above it. */
  label: string | null;
  items: NavItem[];
};

/**
 * Grouped by what the user is doing, not by table name: capture first, then the
 * vault itself, then what the knowledge is actually for.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboardIcon },
      { href: ROUTES.search, label: "Buscar", icon: SearchIcon },
      { href: ROUTES.inbox, label: "Inbox", icon: InboxIcon },
    ],
  },
  {
    label: "Acervo",
    items: [
      { href: ROUTES.knowledge, label: "Conhecimentos", icon: LibraryBigIcon, stage: "Etapa 3" },
      { href: ROUTES.sources, label: "Fontes", icon: BookMarkedIcon, stage: "Etapa 4" },
      { href: ROUTES.areas, label: "Áreas", icon: BoxesIcon, stage: "Etapa 4" },
      { href: ROUTES.tags, label: "Tags", icon: TagsIcon, stage: "Etapa 4" },
    ],
  },
  {
    label: "Aplicação",
    items: [
      { href: ROUTES.projects, label: "Projetos", icon: FolderKanbanIcon },
      { href: ROUTES.reviews, label: "Revisões", icon: RepeatIcon, stage: "Etapa 14" },
      { href: ROUTES.graph, label: "Grafo", icon: NetworkIcon },
    ],
  },
  {
    label: null,
    items: [{ href: ROUTES.settings, label: "Configurações", icon: SettingsIcon, stage: "Etapa 2+" }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * Whether a nav item should render as the current page.
 *
 * A detail page such as `/conhecimentos/pandas` has to keep "Conhecimentos"
 * highlighted, so the match is prefix-based — but only on a path boundary.
 * A plain `startsWith` would light up "Tags" while the user is on a
 * hypothetical `/tags-arquivadas`.
 *
 * The dashboard is matched exactly: as the shortest path, a prefix rule would
 * leave it highlighted everywhere.
 */
export function isActiveNavItem(pathname: string, href: string): boolean {
  if (href === ROUTES.dashboard) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The current page's title, for the mobile header and the document title. */
export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => isActiveNavItem(pathname, item.href));
}
