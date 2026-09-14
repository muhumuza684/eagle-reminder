// Corner radius scale. Current screens use 13, 15, 16, 17, 18, 19, 20, 22,
// 26, 28 for what is conceptually the same handful of shapes (chip, card,
// sheet). Consolidating to four values so every card genuinely looks like
// the same design language.
export const radii = {
  chip: 10,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;