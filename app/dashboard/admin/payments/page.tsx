import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AdminPaymentsPage() {
  const session = await getCurrentSession();

  if (session?.role !== "ADMIN") {
    return (
      <DashboardShell title="Admin Payments" role="USER">
        <div className="panel">
          <p className="error">Admin access required.</p>
        </div>
      </DashboardShell>
    );
  }

  const payments = await db.paymentTransaction.findMany({
    include: {
      user: true,
      plan: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return (
    <DashboardShell title="Admin Payments" role={session.role}>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Order</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.user.email}</td>
                <td>{payment.plan.name}</td>
                <td><span className="badge">{payment.status}</span></td>
                <td>${payment.amountUsd}</td>
                <td>{payment.orderId}</td>
                <td>{new Date(payment.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">No payments yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}