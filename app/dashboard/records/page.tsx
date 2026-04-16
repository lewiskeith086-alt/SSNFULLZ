import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { userHasActiveSubscription } from "@/lib/subscription";
import { DashboardShell } from "@/components/dashboard-shell";

type SearchParams = {
  q?: string;
  firstName?: string;
  lastName?: string;
  birthYear?: string;
  phone?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  datasetId?: string;
  sort?: string;
};

function contains(value?: string) {
  return value ? { contains: value, mode: "insensitive" as const } : undefined;
}

function maskDigits(value?: string | null, visible = 4) {
  if (!value) return "—";
  const trimmed = value.trim();
  if (trimmed.length <= visible) return trimmed;
  const hiddenCount = trimmed.length - visible;
  return `${"*".repeat(hiddenCount)}${trimmed.slice(-visible)}`;
}

function formatDob(value?: string | null) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return value;
}

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getCurrentSession();
  if (!session) return null;

  const allowed =
    session.role === "ADMIN" || (await userHasActiveSubscription(session.sub));

  if (!allowed) {
    return (
      <DashboardShell title="Search" role={session.role}>
        <div className="panel">
          <p className="error">Active subscription required to access search.</p>
          <div className="actions">
            <Link className="button" href="/pricing">
              View plans
            </Link>
            <Link className="button secondary" href="/dashboard/billing">
              Billing
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const params = await searchParams;
  const datasets =
    session.role === "ADMIN"
      ? await db.dataset.findMany({ orderBy: { name: "asc" } })
      : [];

  const hasSearch =
    !!params.q ||
    !!params.firstName ||
    !!params.lastName ||
    !!params.birthYear ||
    !!params.phone ||
    !!params.city ||
    !!params.state ||
    !!params.zipCode ||
    !!params.datasetId;

  const where: any = {
    AND: [
      params.firstName ? { firstName: contains(params.firstName) } : {},
      params.lastName ? { lastName: contains(params.lastName) } : {},
      params.birthYear ? { birthYear: Number(params.birthYear) || undefined } : {},
      params.phone ? { phone: contains(params.phone) } : {},
      params.city ? { city: contains(params.city) } : {},
      params.state ? { state: contains(params.state) } : {},
      params.zipCode ? { zipCode: contains(params.zipCode) } : {},
      session.role === "ADMIN" && params.datasetId ? { datasetId: params.datasetId } : {},
      params.q
        ? {
            OR: [
              { firstName: contains(params.q) },
              { lastName: contains(params.q) },
              { city: contains(params.q) },
              { state: contains(params.q) },
              { zipCode: contains(params.q) },
              { externalId: contains(params.q) },
            ],
          }
        : {},
    ],
  };

  const orderBy =
    params.sort === "oldest"
      ? { createdAt: "asc" as const }
      : params.sort === "name_asc"
      ? { firstName: "asc" as const }
      : params.sort === "name_desc"
      ? { firstName: "desc" as const }
      : { createdAt: "desc" as const };

  const records = hasSearch
    ? await db.record.findMany({
        where,
        include: { dataset: true },
        orderBy,
        take: 100,
      })
    : [];

  return (
    <DashboardShell title={session.role === "ADMIN" ? "Records" : "Search"} role={session.role}>
      <form className="panel" method="GET" style={{ marginBottom: 16 }}>
        <div
          className="search-grid"
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
          }}
        >
          <input name="q" defaultValue={params.q ?? ""} placeholder="Quick search" />
          <input name="firstName" defaultValue={params.firstName ?? ""} placeholder="First name" />
          <input name="lastName" defaultValue={params.lastName ?? ""} placeholder="Last name" />
          <input name="birthYear" defaultValue={params.birthYear ?? ""} placeholder="Birth year" />
          <input name="phone" defaultValue={params.phone ?? ""} placeholder="Phone" />
          <input name="city" defaultValue={params.city ?? ""} placeholder="City" />
          <input name="state" defaultValue={params.state ?? ""} placeholder="State" />
          <input name="zipCode" defaultValue={params.zipCode ?? ""} placeholder="ZIP" />
        </div>

        <div className="actions" style={{ marginTop: 12 }}>
          {session.role === "ADMIN" ? (
            <select name="datasetId" defaultValue={params.datasetId ?? ""}>
              <option value="">All datasets</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : null}

          <select name="sort" defaultValue={params.sort ?? "newest"}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>

          <button type="submit">Search</button>
          <Link className="button secondary" href="/dashboard/records">
            Clear
          </Link>
        </div>
      </form>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>DOB</th>
              <th>Address</th>
              <th>City/State</th>
              <th>ZIP</th>
              <th>Phone</th>
              <th>SSN </th>
            </tr>
          </thead>
          <tbody>
            {!hasSearch ? (
              <tr>
                <td colSpan={8} className="muted">
                  Enter search criteria to find matching records.
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">
                  No matching results found.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td>{r.externalId ?? "—"}</td>
                  <td>{[r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ") || "—"}</td>
                  <td>{formatDob(r.dateOfBirthRaw)}</td>
                  <td>{r.addressLine1 ?? "—"}</td>
                  <td>{[r.city, r.state].filter(Boolean).join(", ") || "—"}</td>
                  <td>{r.zipCode ?? "—"}</td>
                  <td>{r.phone ?? "—"}</td>
                  <td>{r.ssNumber ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
