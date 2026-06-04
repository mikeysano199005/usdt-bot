// Strips whitespace and common invisible/zero-width characters (U+200B-U+200D,
// U+FEFF) that get pasted from mobile wallets, then validates a BEP20 address.
const INVISIBLE_CHARS = new RegExp('[\\s\\u200B-\\u200D\\uFEFF]', 'g');

export function cleanWalletInput(raw: string): string {
  return raw.replace(INVISIBLE_CHARS, '');
}

export function isValidBep20Address(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
