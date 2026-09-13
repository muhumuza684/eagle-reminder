export const Platform = {
  OS: "web",
  select: (options) => options?.web ?? options?.default,
};

export default { Platform };