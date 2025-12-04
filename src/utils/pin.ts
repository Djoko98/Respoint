export const hashPin = async (pin: string): Promise<string> => {
  const enc = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
};

