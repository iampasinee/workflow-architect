// UUID identity is independent of mutable user-facing codes and collection length.
export function allocateEntityId(prefix: string, existing: readonly { id: string }[]): string {
  const occupied = new Set(existing.map((item) => item.id));
  for (let attempt = 0; attempt < 10; attempt++) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const uuid = globalThis.crypto.randomUUID?.() || Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const id = `${prefix}_${uuid}`;
    if (!occupied.has(id)) return id;
  }
  throw new Error('ไม่สามารถสร้าง ID ที่ไม่ซ้ำได้');
}
