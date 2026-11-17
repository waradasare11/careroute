export function newId(prefix: string): string {
  const c = globalThis.crypto as Crypto | undefined;
  const raw = c?.randomUUID ? c.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${raw.replace(/-/g, "").slice(0, 12)}`;
}

