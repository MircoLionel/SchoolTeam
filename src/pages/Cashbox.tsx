import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";
import {
  appendCashboxAudit,
  appendCashboxExpense,
  readCashboxAudit,
  readCashboxCategories,
  readCashboxExpenses,
  readCashIncomes,
  resetCashIncomes,
  saveCashboxCategories,
  saveCashboxExpenses,
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
  const { user } = useAuth();
  const actorName = user?.name ?? "Sistema";
  const isAdmin = user?.role === Role.ADMIN;

  const [reloadKey, setReloadKey] = useState(0);
  const [categories, setCategories] = useState<CashboxCategory[]>(readCashboxCategories);
  const [audit, setAudit] = useState(() => readCashboxAudit().slice(0, 12));
  const [newCategory, setNewCategory] = useState({ label: "", color: "#175cd3" });
  const [expenseForm, setExpenseForm] = useState({
    categoryId: String(readCashboxCategories()[0]?.id ?? ""),
    amount: "",
    description: "",
  });

  const incomesFromCoupons = useMemo(() => readCashIncomes().reduce((acc, movement) => acc + movement.amount, 0), [reloadKey]);
  const expenses = useMemo(() => readCashboxExpenses(), [reloadKey]);

  const amountsByCategory = useMemo(() => {
    const map = new Map<number, number>();
    expenses.forEach((expense) => {
      map.set(expense.categoryId, (map.get(expense.categoryId) ?? 0) + expense.amount);
    });
    return map;
  }, [expenses]);

  const categoriesWithAmount = useMemo(
    () => categories.map((category) => ({ ...category, amount: amountsByCategory.get(category.id) ?? 0 })),
    [categories, amountsByCategory]
  );

  const totalEgresos = useMemo(
    () => categoriesWithAmount.reduce((acc, category) => acc + category.amount, 0),
    [categoriesWithAmount]
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

  const onResetCashbox = () => {
    const password = window.prompt("Ingresá la contraseña para resetear caja:");
    if (password === null) return;

    if (password !== "Balto-Ringo") {
      window.alert("Contraseña incorrecta.");
      return;
    }

    resetCashIncomes();
    recordAudit("reset_cashbox", "Reseteó ingresos de caja a $0");
    setReloadKey((current) => current + 1);
    window.alert("Caja (ingresos) reseteada a $0.");
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

  const handleCreateExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

    appendCashboxExpense({
      id: Date.now(),
      categoryId,
      amount,
      description: expenseForm.description.trim() || "Sin detalle",
      createdAt: new Date().toISOString(),
      createdBy: actorName,
    });

    setExpenseForm((current) => ({ ...current, amount: "", description: "" }));
    recordAudit("add_expense", `Agregó gasto ${formatCurrency(amount)} en "${category.label}" · ${expenseForm.description.trim() || "Sin detalle"}`);
    setReloadKey((current) => current + 1);
  };

  const handleEditExpense = (expenseId: number) => {
    if (!isAdmin) {
      window.alert("Solo ADMIN puede editar gastos.");
      return;
    }

    const current = expenses.find((item) => item.id === expenseId);
    if (!current) return;

    const nextDescription = window.prompt("Nueva descripción:", current.description) ?? current.description;
    const nextAmountRaw = window.prompt("Nuevo importe:", String(current.amount));
    if (nextAmountRaw === null) return;
    const nextAmount = Number(nextAmountRaw);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      window.alert("Importe inválido.");
      return;
    }

    const next = expenses.map((item) =>
      item.id === expenseId
        ? { ...item, description: nextDescription.trim() || "Sin detalle", amount: nextAmount }
        : item
    );
    saveCashboxExpenses(next);
    recordAudit("edit_expense", `Editó gasto #${expenseId} a ${formatCurrency(nextAmount)} · ${nextDescription.trim() || "Sin detalle"}`);
    setReloadKey((value) => value + 1);
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
        ) : expenses.slice(0, 20).map((expense) => {
          const category = categories.find((c) => c.id === expense.categoryId);
          return (
            <div key={expense.id} className="table-row table-row-expenses">
              <span>{expense.description}</span>
              <span>{category?.label ?? "Sin categoría"}</span>
              <span>{formatCurrency(expense.amount)}</span>
              <span>
                {isAdmin ? <button type="button" className="btn" onClick={() => handleEditExpense(expense.id)}>Editar gasto</button> : "-"}
              </span>
            </div>
          );
        })}
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
