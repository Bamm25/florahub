// Utilitas masking PII terpusat untuk portal admin dan audit log

export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return "****";
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}

export function maskIpAddress(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.split(",")[0]?.trim();
  if (!trimmed) return null;

  if (trimmed.includes(".")) {
    const octets = trimmed.split(".");
    if (octets.length === 4) {
      return `${octets[0]}.${octets[1]}.*.*`;
    }
  }

  if (trimmed.includes(":")) {
    const groups = trimmed.split(":");
    return `${groups.slice(0, 2).join(":")}:****`;
  }

  return "***";
}
