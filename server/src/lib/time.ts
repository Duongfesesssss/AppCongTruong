export const parseDurationToMs = (value: string, fallbackMs: number) => {
  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  return amount * (multipliers[unit] ?? 1);
};
