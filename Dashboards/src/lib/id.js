// crypto.randomUUID needs a secure context; this works on plain-http LAN testing too.
export function newId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
