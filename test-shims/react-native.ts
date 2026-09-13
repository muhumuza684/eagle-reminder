type PlatformSelectOptions = {
  web?: unknown;
  default?: unknown;
  ios?: unknown;
  android?: unknown;
};

export const Platform = {
  OS: "web",
  select: (options: PlatformSelectOptions) => options?.web ?? options?.default,
};

export default { Platform };