export type MainNavItem = {
  key: "today" | "progress" | "review" | "settings";
  label: string;
  href: "/" | "/dashboard" | "/review" | "/settings";
};

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { key: "today", label: "Today", href: "/" },
  { key: "progress", label: "Progress", href: "/dashboard" },
  { key: "review", label: "Review", href: "/review" },
  { key: "settings", label: "Settings", href: "/settings" },
];
