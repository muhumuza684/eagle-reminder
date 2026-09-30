export type MainNavItem = {
  key: "today" | "settings";
  label: string;
  href: "/" | "/settings";
};

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { key: "today", label: "Today", href: "/" },
  { key: "settings", label: "Settings", href: "/settings" },
];