import { useMemo, useState } from "react";

interface AccountItem {
  id: number;
  passenger: string;
  tripValue: number;
  paidAmount: number;
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const initialAccounts: AccountItem[] = [
  { id: 1, passenger: "Lucía Pérez", tripValue: 820000, paidAmount: 180000 },
  { id: 2, passenger: "Juan Gómez", tripValue: 820000, paidAmount: 300000 },
  { id: 3, passenger: "Mora Díaz", tripValue: 820000, paidAmount: 640000 }
];

export function Accounts() {
  const [accounts] = useState<AccountItem[]>(initialAccounts);

  const rows = useMemo(
    () =>
      accounts.map((account) => {
        const paidPct = Math.max(0, Math.min(100, (account.paidAmount / account.tripValue) * 100));
        const redWidth = Math.min(30, paidPct);
        const greenWidth = paidPct > 30 ? paidPct - 30 : 0;
        const grayWidth = Math.max(0, 100 - paidPct);

        return {
          ...account,
          paidPct,
          redWidth,
          greenWidth,
          grayWidth,
          redAmount: Math.min(account.paidAmount, account.tripValue * 0.3),
          greenAmount: Math.max(0, account.paidAmount - account.tripValue * 0.3),
          grayAmount: Math.max(0, account.tripValue - account.paidAmount)
        };
      }),
    [accounts]
  );

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Estado de cuenta</h1>
          <p>
            Rojo: pago menor al 30% · Verde: pago acumulado sobre el 30% · Gris: saldo restante con montos.
          </p>
        </div>
      </header>

      <div className="card account-list">
        {rows.map((row) => (
          <article key={row.id} className="account-item">
            <div className="account-head">
              <h3>{row.passenger}</h3>
              <span>
                Pagó {currencyFormatter.format(row.paidAmount)} de {currencyFormatter.format(row.tripValue)} ({" "}
                {row.paidPct.toFixed(1)}%)
              </span>
            </div>

            <div className="progress-stack" aria-label={`Estado de cuenta de ${row.passenger}`}>
              <div className="segment red" style={{ width: `${row.redWidth}%` }} />
              <div className="segment green" style={{ width: `${row.greenWidth}%` }} />
              <div className="segment gray" style={{ width: `${row.grayWidth}%` }} />
            </div>

            <div className="legend-grid">
              <span>
                <strong>Rojo:</strong> {currencyFormatter.format(row.redAmount)}
              </span>
              <span>
                <strong>Verde:</strong> {currencyFormatter.format(row.greenAmount)}
              </span>
              <span>
                <strong>Gris:</strong> {currencyFormatter.format(row.grayAmount)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
