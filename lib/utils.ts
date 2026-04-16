export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
export function normalizePhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "");
}
export function safeJson<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}
export function formatRemainingTime(endDate: Date) {
  const diff = endDate.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}
export function csvSplitLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++; } else inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
export function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = csvSplitLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = csvSplitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => row[h] = cols[i] ?? "");
    return row;
  });
}
