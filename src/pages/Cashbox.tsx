import { FormEvent, useEffect, useMemo, useState } from "react";
import { createCashExpense, deleteCashExpense, fetchCashMovements, fetchPaymentsReport, fetchUsers, resetCashboxRecords, type CashMovementRecord, type PaymentReportRecord } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";
import {
  appendCashboxAudit,
  readCashboxAudit,
  readCashboxCategories,
  saveCashboxCategories,
  type CashboxCategory,
} from "../state/passengersStorage";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function Cashbox() {
  const { user, token } = useAuth();
  const actorName = user?.name ?? "Sistema";
  const isAdmin = user?.role === Role.ADMIN;

  const [categories, setCategories] = useState<CashboxCategory[]>(readCashboxCategories);
  const [audit, setAudit] = useState(() => readCashboxAudit().slice(0, 12));
  const [movements, setMovements] = useState<CashMovementRecord[]>([]);
  const [boxFilter, setBoxFilter] = useState<"ALL" | "CASH" | "BANK">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportDateTo, setReportDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportUserId, setReportUserId] = useState<string>("all");
  const [reportCashBox, setReportCashBox] = useState<"ALL" | "CASH" | "BANK">("ALL");
  const [reportRows, setReportRows] = useState<PaymentReportRecord[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [newCategory, setNewCategory] = useState({ label: "", color: "#175cd3" });
  const [expenseForm, setExpenseForm] = useState({
    categoryId: String(readCashboxCategories()[0]?.id ?? ""),
    amount: "",
    description: "",
    cashBox: "CASH" as "CASH" | "BANK",
  });

  const lastResetAt = useMemo(() => {
    const resetEntry = readCashboxAudit().find((entry) => entry.action === "reset_cashbox");
    return resetEntry?.createdAt ?? null;
  }, [audit]);

  const loadMovements = async () => {
    if (!token) return;
    const data = await fetchCashMovements(token);
    setMovements(data);
  };

  useEffect(() => {
    loadMovements().catch(() => setMovements([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchUsers(token)
      .then((data) => setUsers(data.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => setUsers([]));
  }, [token]);

  const activePeriodMovements = useMemo(() => {
    if (!lastResetAt) return movements;
    return movements.filter((movement) => movement.date >= lastResetAt);
  }, [lastResetAt, movements]);

  const filteredMovements = useMemo(() => {
    return activePeriodMovements.filter((movement) => {
      const movementDate = movement.date?.slice(0, 10);
      if (dateFrom && movementDate < dateFrom) return false;
      if (dateTo && movementDate > dateTo) return false;
      if (boxFilter === "ALL") return true;
      const resolvedBox = movement.cash_box ?? (movement.method === "CASH" ? "CASH" : "BANK");
      return resolvedBox === boxFilter;
    });
  }, [activePeriodMovements, boxFilter, dateFrom, dateTo]);

  const incomesCash = useMemo(
    () => activePeriodMovements
      .filter((m) => m.type === "INCOME" && (m.cash_box === "CASH" || (!m.cash_box && m.method === "CASH")))
      .reduce((acc, m) => acc + m.amount, 0),
    [activePeriodMovements]
  );
  const incomesBank = useMemo(
    () => activePeriodMovements
      .filter((m) => m.type === "INCOME" && (m.cash_box === "BANK" || (!m.cash_box && m.method === "TRANSFER")))
      .reduce((acc, m) => acc + m.amount, 0),
    [activePeriodMovements]
  );
  const expenses = useMemo(() => activePeriodMovements.filter((m) => m.type === "EXPENSE"), [activePeriodMovements]);
  const visibleExpenses = useMemo(() => filteredMovements.filter((m) => m.type === "EXPENSE"), [filteredMovements]);
  const expensesCash = useMemo(
    () => expenses
      .filter((m) => m.cash_box === "CASH" || !m.cash_box)
      .reduce((acc, m) => acc + m.amount, 0),
    [expenses]
  );
  const expensesBank = useMemo(
    () => expenses
      .filter((m) => m.cash_box === "BANK")
      .reduce((acc, m) => acc + m.amount, 0),
    [expenses]
  );

  const amountsByCategory = useMemo(() => {
    const map = new Map<number, number>();
    expenses.forEach((expense) => {
      const localCategory = categories.find((c) => c.label === (expense.category_name ?? ""));
      const key = localCategory?.id ?? 0;
      map.set(key, (map.get(key) ?? 0) + expense.amount);
    });
    return map;
  }, [categories, expenses]);

  const categoriesWithAmount = useMemo(
    () => categories.map((category) => ({ ...category, amount: amountsByCategory.get(category.id) ?? 0 })),
    [categories, amountsByCategory]
  );

  const totalEgresos = useMemo(
    () => expenses.reduce((acc, expense) => acc + expense.amount, 0),
    [expenses]
  );

  const cashBalance = incomesCash - expensesCash;
  const bankBalance = incomesBank - expensesBank;
  const balance = cashBalance + bankBalance;

  const chart = useMemo(() => {
    if (totalEgresos <= 0) {
      return "conic-gradient(#e4e7ec 0deg 360deg)";
    }
    let currentDeg = 0;
    const stops = categoriesWithAmount
      .filter((category) => category.amount > 0)
      .map((category) => {
        const ratio = category.amount / totalEgresos;
        const start = currentDeg;
        const end = currentDeg + ratio * 360;
        currentDeg = end;
        return `${category.color} ${start}deg ${end}deg`;
      });
    return `conic-gradient(${stops.join(", ")})`;
  }, [categoriesWithAmount, totalEgresos]);

  const recordAudit = (action: "create_category" | "update_category" | "add_expense" | "edit_expense" | "reset_cashbox", detail: string) => {
    appendCashboxAudit({
      id: Date.now(),
      action,
      actorName,
      createdAt: new Date().toISOString(),
      detail,
    });
    setAudit(readCashboxAudit().slice(0, 12));
  };

  const onResetCashbox = async () => {
    const password = window.prompt("Ingresá la contraseña para resetear caja:");
    if (password === null) return;

    if (password !== "Balto-Ringo") {
      window.alert("Contraseña incorrecta.");
      return;
    }

    if (!token) return;
    await resetCashboxRecords(token);
    recordAudit("reset_cashbox", "Reseteó caja a 0 e inició un nuevo período");
    await loadMovements();
    window.alert("Caja reseteada.");
  };

  const handleCreateCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = newCategory.label.trim();
    if (!label) return;

    const nextCategory: CashboxCategory = {
      id: Date.now(),
      label,
      color: newCategory.color || "#175cd3",
      createdAt: new Date().toISOString(),
      createdBy: actorName,
    };

    const next = [...categories, nextCategory];
    setCategories(next);
    saveCashboxCategories(next);
    setNewCategory({ label: "", color: "#175cd3" });
    setExpenseForm((current) => ({ ...current, categoryId: String(nextCategory.id) }));
    recordAudit("create_category", `Creó categoría "${nextCategory.label}"`);
  };

  const handleEditCategory = (category: CashboxCategory) => {
    const nextLabel = window.prompt("Nuevo nombre de la categoría:", category.label);
    if (nextLabel === null) return;

    const cleanLabel = nextLabel.trim();
    if (!cleanLabel) {
      window.alert("El nombre no puede quedar vacío.");
      return;
    }

    const nextColor = window.prompt("Color HEX (ej: #2563eb):", category.color) ?? category.color;

    const next = categories.map((item) =>
      item.id === category.id
        ? {
            ...item,
            label: cleanLabel,
            color: /^#[0-9a-fA-F]{6}$/.test(nextColor.trim()) ? nextColor.trim() : item.color,
            updatedAt: new Date().toISOString(),
            updatedBy: actorName,
          }
        : item
    );

    setCategories(next);
    saveCashboxCategories(next);
    recordAudit("update_category", `Editó categoría "${category.label}" -> "${cleanLabel}"`);
  };

  const handleCreateExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const amount = Number(expenseForm.amount);
    const categoryId = Number(expenseForm.categoryId);
    if (!categoryId || !Number.isFinite(amount) || amount <= 0) {
      window.alert("Seleccioná categoría e importe válido.");
      return;
    }

    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      window.alert("La categoría no existe.");
      return;
    }

    await createCashExpense(token, {
      amount,
      description: expenseForm.description.trim() || "Sin detalle",
      category_name: category.label,
      cash_box: expenseForm.cashBox,
    });

    setExpenseForm((current) => ({ ...current, amount: "", description: "" }));
    recordAudit("add_expense", `Agregó gasto ${formatCurrency(amount)} en "${category.label}" · ${expenseForm.description.trim() || "Sin detalle"}`);
    await loadMovements();
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!token) return;
    await deleteCashExpense(token, expenseId);
    recordAudit("edit_expense", `Eliminó egreso #${expenseId}`);
    await loadMovements();
  };

  const exportCashboxCsv = () => {
    const exportedAt = new Date().toISOString();
    const lines: string[] = [];
    const pushRow = (row: Array<string | number>) => {
      lines.push(row.map((value) => `"${String(value).replace(/"/g, "\"\"")}"`).join(","));
    };

    pushRow(["seccion", "dato", "valor"]);
    pushRow(["resumen", "fecha_hora_exportacion", exportedAt]);
    pushRow(["resumen", "caja_efectivo", cashBalance]);
    pushRow(["resumen", "caja_banco", bankBalance]);
    pushRow(["resumen", "total_caja", balance]);
    pushRow(["resumen", "ingresos_totales", incomesCash + incomesBank]);
    pushRow(["resumen", "egresos_totales", totalEgresos]);
    pushRow(["resumen", "saldo_final", balance]);
    pushRow(["resumen", "periodo_desde_ultimo_reseteo", lastResetAt ?? "sin_reseteo"]);
    lines.push("");
    pushRow(["distribucion_egresos", "categoria", "monto"]);
    categoriesWithAmount.forEach((category) => {
      if (category.amount > 0) pushRow(["distribucion_egresos", category.label, category.amount]);
    });
    lines.push("");
    pushRow(["movimientos", "fecha", "tipo", "caja", "categoria", "detalle", "monto", "usuario"]);
    activePeriodMovements.forEach((movement) => {
      const resolvedBox = movement.cash_box ?? (movement.method === "CASH" ? "CASH" : "BANK");
      pushRow([
        "movimientos",
        movement.date,
        movement.type,
        resolvedBox,
        movement.category_name ?? "",
        movement.detail ?? "",
        movement.amount,
        movement.user_name ?? "",
      ]);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `caja_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const loadReport = async () => {
    if (!token) return;
    const rows = await fetchPaymentsReport(token, {
      date_from: reportDateFrom || undefined,
      date_to: reportDateTo || undefined,
      user_id: reportUserId === "all" ? undefined : Number(reportUserId),
      cash_box: reportCashBox,
    });
    setReportRows(rows);
  };

  useEffect(() => {
    loadReport().catch(() => setReportRows([]));
  }, [token]);

  const totalsByDay = useMemo(() => {
    const map = new Map<string, number>();
    reportRows.forEach((row) => map.set(row.date, (map.get(row.date) ?? 0) + row.amount));
    return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }));
  }, [reportRows]);

  const totalsByUser = useMemo(() => {
    const map = new Map<string, number>();
    reportRows.forEach((row) => map.set(row.user_name, (map.get(row.user_name) ?? 0) + row.amount));
    return Array.from(map.entries()).map(([userName, amount]) => ({ userName, amount }));
  }, [reportRows]);
  const reportTotal = useMemo(() => reportRows.reduce((acc, row) => acc + row.amount, 0), [reportRows]);

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Caja</h1>
          <p>Gestioná ingresos, categorías y gastos con trazabilidad de cambios.</p>
        </div>
        <span className={`badge ${balance >= 0 ? "badge-positive" : "badge-negative"}`}>
          Balance: {formatCurrency(balance)}
        </span>
        <button type="button" className="btn btn-danger" onClick={onResetCashbox}>
          Resetear caja a 0
        </button>
        <button type="button" className="btn" onClick={exportCashboxCsv}>
          Exportar caja CSV
        </button>
      </header>

      <div className="card form-grid">
        <label className="field">
          <span>Filtro desde (caja)</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>Filtro hasta (caja)</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label className="field">
          <span>Caja / medio</span>
          <select value={boxFilter} onChange={(e) => setBoxFilter(e.target.value as "ALL" | "CASH" | "BANK")}>
            <option value="ALL">Todas</option>
            <option value="CASH">EFECTIVO</option>
            <option value="BANK">BANCO</option>
          </select>
        </label>
      </div>

      <div className="card form-grid">
        <form className="field" onSubmit={handleCreateCategory}>
          <span>Nueva categoría</span>
          <input value={newCategory.label} onChange={(e) => setNewCategory((c) => ({ ...c, label: e.target.value }))} placeholder="Ej: Peajes" />
          <input type="color" value={newCategory.color} onChange={(e) => setNewCategory((c) => ({ ...c, color: e.target.value }))} />
          <button className="btn" type="submit">Crear categoría</button>
        </form>

        <form className="field" onSubmit={handleCreateExpense}>
          <span>Agregar gasto</span>
          <select value={expenseForm.categoryId} onChange={(e) => setExpenseForm((c) => ({ ...c, categoryId: e.target.value }))}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
          <input type="number" min="1" value={expenseForm.amount} onChange={(e) => setExpenseForm((c) => ({ ...c, amount: e.target.value }))} placeholder="Importe" />
          <select value={expenseForm.cashBox} onChange={(e) => setExpenseForm((c) => ({ ...c, cashBox: e.target.value as "CASH" | "BANK" }))}>
            <option value="CASH">Caja efectivo</option>
            <option value="BANK">Caja banco</option>
          </select>
          <input value={expenseForm.description} onChange={(e) => setExpenseForm((c) => ({ ...c, description: e.target.value }))} placeholder="Detalle (opcional)" />
          <button className="btn" type="submit">Guardar gasto</button>
        </form>
      </div>

      <div className="cashbox-grid">
        <div className="card cashbox-chart-card">
          <h3>Distribución de egresos</h3>
          <div className="donut" style={{ background: chart }}>
            <div className="donut-center">
              <small>Egresos</small>
              <strong>{formatCurrency(totalEgresos)}</strong>
            </div>
          </div>
        </div>

        <div className="card cashbox-summary">
          <h3>Movimientos desde último reseteo</h3>
          <div className="cashbox-row">
            <span>Caja efectivo</span>
            <strong>{formatCurrency(cashBalance)}</strong>
          </div>
          <div className="cashbox-row">
            <span>Caja banco</span>
            <strong>{formatCurrency(bankBalance)}</strong>
          </div>
          <div className="cashbox-row">
            <span>Total caja (efectivo + banco)</span>
            <strong>{formatCurrency(balance)}</strong>
          </div>
          <div className="cashbox-row total">
            <span>Ingresos totales / Egresos totales</span>
            <strong>{formatCurrency(incomesCash + incomesBank)} / {formatCurrency(totalEgresos)}</strong>
          </div>
        </div>
      </div>

      <div className="card placeholder-table">
        <div className="table-row header table-row-cashbox table-row-cashbox-editable">
          <span>Categoría</span>
          <span>Participación</span>
          <span>Monto</span>
          <span>Acción</span>
        </div>
        {categoriesWithAmount.map((category) => {
          const percentage = totalEgresos > 0 ? ((category.amount / totalEgresos) * 100).toFixed(1) : "0.0";
          return (
            <div key={category.id} className="table-row table-row-cashbox table-row-cashbox-editable">
              <span className="cashbox-category">
                <i style={{ backgroundColor: category.color }} />
                {category.label}
              </span>
              <span>{percentage}%</span>
              <span>{formatCurrency(category.amount)}</span>
              <span><button type="button" className="btn" onClick={() => handleEditCategory(category)}>Editar</button></span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>Reporte diario de cobros por usuario</h3>
        <div className="form-row">
          <label className="field">
            <span>Desde</span>
            <input type="date" value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input type="date" value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} />
          </label>
          <label className="field">
            <span>Usuario</span>
            <select value={reportUserId} onChange={(e) => setReportUserId(e.target.value)}>
              <option value="all">Todos</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Medio / Caja</span>
            <select value={reportCashBox} onChange={(e) => setReportCashBox(e.target.value as "ALL" | "CASH" | "BANK")}>
              <option value="ALL">Todos</option>
              <option value="CASH">EFECTIVO</option>
              <option value="BANK">BANCO</option>
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => loadReport().catch(() => setReportRows([]))}>Filtrar reporte</button>
        </div>
      </div>

      <div className="card placeholder-table">
        <div className="table-row header">
          <span>Fecha</span><span>Usuario</span><span>Escuela</span><span>Salida</span><span>Pasajero</span><span>Medio</span><span>Monto</span>
        </div>
        {reportRows.length === 0 ? (
          <div className="table-row"><span>Sin datos</span><span>-</span><span>-</span><span>-</span><span>-</span><span>-</span><span>-</span></div>
        ) : reportRows.map((row) => (
          <div className="table-row" key={row.id}>
            <span>{row.date}</span>
            <span>{row.user_name}</span>
            <span>{row.school_name}</span>
            <span>{row.trip_name || row.trip_destination || "-"}</span>
            <span>{row.passenger_name}</span>
            <span>{row.cash_box === "BANK" ? "BANCO/TRANSFERENCIA" : "EFECTIVO"}</span>
            <span>{formatCurrency(row.amount)}</span>
          </div>
        ))}
      </div>

      <div className="card placeholder-table">
        <div className="table-row header">
          <span>Total por día</span><span>Monto</span>
        </div>
        {totalsByDay.map((row) => (
          <div className="table-row" key={row.date}><span>{row.date}</span><span>{formatCurrency(row.amount)}</span></div>
        ))}
      </div>

      <div className="card placeholder-table">
        <div className="table-row header">
          <span>Total por usuario</span><span>Monto</span>
        </div>
        {totalsByUser.map((row) => (
          <div className="table-row" key={row.userName}><span>{row.userName}</span><span>{formatCurrency(row.amount)}</span></div>
        ))}
        <div className="table-row"><span><strong>Total general</strong></span><span><strong>{formatCurrency(reportTotal)}</strong></span></div>
      </div>

      <div className="card placeholder-table">
        <div className="table-row header table-row-expenses">
          <span>Gasto</span>
          <span>Categoría</span>
          <span>Caja</span>
          <span>Importe</span>
          <span>Acción</span>
        </div>
        {visibleExpenses.length === 0 ? (
          <div className="table-row table-row-expenses">
            <span>Sin gastos registrados</span><span>-</span><span>-</span><span>-</span><span>-</span>
          </div>
        ) : visibleExpenses.slice(0, 20).map((expense) => (
          <div key={expense.id} className="table-row table-row-expenses">
            <span>{expense.detail ?? "Sin detalle"}</span>
            <span>{expense.category_name ?? "Sin categoría"}</span>
            <span>{expense.cash_box === "BANK" ? "BANCO" : "EFECTIVO"}</span>
            <span>{formatCurrency(expense.amount)}</span>
            <span>
              {isAdmin ? <button type="button" className="btn btn-danger" onClick={() => handleDeleteExpense(expense.id)}>Eliminar egreso</button> : "-"}
            </span>
          </div>
        ))}
      </div>

      <div className="card placeholder-table">
        <div className="table-row header table-row-audit">
          <span>Auditoría caja</span>
          <span>Usuario</span>
          <span>Fecha/Hora</span>
        </div>
        {audit.length === 0 ? (
          <div className="table-row table-row-audit"><span>Sin movimientos</span><span>-</span><span>-</span></div>
        ) : audit.map((entry) => (
          <div key={entry.id} className="table-row table-row-audit">
            <span>{entry.detail}</span>
            <span>{entry.actorName}</span>
            <span>{new Date(entry.createdAt).toLocaleString("es-AR")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
