export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) {
    return "****";
  }
  const last4 = digits.slice(-4);
  if (value.startsWith("+") && digits.length >= 8) {
    const prefix = `+${digits.slice(0, digits.length - 4 - 4)}`;
    const areaKeep = digits.length === 13 ? 4 : Math.min(4, digits.length - 4);
    const keep = `+${digits.slice(0, areaKeep)}`;
    return `${keep}****${last4}`;
  }
  const keep = digits.slice(0, Math.min(4, digits.length - 4));
  return `${keep}****${last4}`;
}
