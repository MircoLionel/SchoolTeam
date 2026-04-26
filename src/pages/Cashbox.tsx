import { FormEvent, useEffect, useMemo, useState } from "react";
import { createCashExpense, deleteCashExpense, fetchCashMovements, resetCashboxRecords, type CashMovementRecord } from "../services/api";
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
  const [newCategory, setNewCategory] = useState({ label: "", color: "#175cd3" });
  const [expenseForm, setExpenseForm] = useState({
    categoryId: String(readCashboxCategories()[0]?.id ?? ""),
    amount: "",
    description: "",
  });

  const loadMovements = async () => {
    if (!token) return;
    const data = await fetchCashMovements(token);
    setMovements(data);
  };

  useEffect(() => {
    loadMovements().catch(() => setMovements([]));
  }, [token]);

  const incomesFromCoupons = useMemo(
    () => movements.filter((m) => m.type === "INCOME").reduce((acc, m) => acc + m.amount, 0),
    [movements]
  );
  const expenses = useMemo(() => movements.filter((m) => m.type === "EXPENSE"), [movements]);

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

  const balance = incomesFromCoupons - totalEgresos;

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
    recordAudit("reset_cashbox", "Reseteó caja y borró movimientos");
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
      </header>

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
          <h3>Movimientos del mes</h3>
          <div className="cashbox-row">
            <span>Ingresos (cupones)</span>
            <strong>{formatCurrency(incomesFromCoupons)}</strong>
          </div>
          <div className="cashbox-row">
            <span>Egresos</span>
            <strong>{formatCurrency(totalEgresos)}</strong>
          </div>
          <div className="cashbox-row total">
            <span>Resultado</span>
            <strong>{formatCurrency(balance)}</strong>
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

      <div className="card placeholder-table">
        <div className="table-row header table-row-expenses">
          <span>Gasto</span>
          <span>Categoría</span>
          <span>Importe</span>
          <span>Acción</span>
        </div>
        {expenses.length === 0 ? (
          <div className="table-row table-row-expenses">
            <span>Sin gastos registrados</span><span>-</span><span>-</span><span>-</span>
          </div>
        ) : expenses.slice(0, 20).map((expense) => (
          <div key={expense.id} className="table-row table-row-expenses">
            <span>{expense.detail ?? "Sin detalle"}</span>
            <span>{expense.category_name ?? "Sin categoría"}</span>
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
