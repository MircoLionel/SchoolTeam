import { FormEvent, useMemo, useState } from "react";

interface ModuleCrudPageProps {
  moduleKey: string;
  title: string;
  description: string;
  itemLabel: string;
}

interface ModuleItem {
  id: number;
  name: string;
  detail: string;
  status: "Activo" | "Pendiente";
}

function createInitialItems(itemLabel: string): ModuleItem[] {
  return Array.from({ length: 3 }).map((_, index) => ({
    id: index + 1,
    name: `${itemLabel} ${index + 1}`,
    detail: "Sincronizado con operación diaria",
    status: index % 2 === 0 ? "Activo" : "Pendiente"
  }));
}

export function ModuleCrudPage({ moduleKey, title, description, itemLabel }: ModuleCrudPageProps) {
  const storageKey = `schoolteam.module.${moduleKey}`;
  const [items, setItems] = useState<ModuleItem[]>(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createInitialItems(itemLabel);
    try {
      return JSON.parse(raw) as ModuleItem[];
    } catch {
      return createInitialItems(itemLabel);
    }
  });
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => {
      return item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q);
    });
  }, [items, query]);

  const persist = (next: ModuleItem[]) => {
    setItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    const next: ModuleItem = {
      id: Date.now(),
      name: name.trim(),
      detail: detail.trim() || "Sin detalle",
      status: "Activo"
    };

    persist([next, ...items]);
    setName("");
    setDetail("");
  };

  const toggleStatus = (id: number) => {
    persist(
      items.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "Activo" ? "Pendiente" : "Activo" }
          : item
      )
    );
  };

  const removeItem = (id: number) => {
    persist(items.filter((item) => item.id !== id));
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="badge">{filteredItems.length} registros</span>
      </header>

      <div className="card form-grid">
        <div className="form-row">
          <label className="field">
            <span>Buscar</span>
            <input
              type="text"
              value={query}
              placeholder="Filtrar por nombre o detalle"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <form className="form-row" onSubmit={onSubmit}>
          <label className="field">
            <span>{itemLabel}</span>
            <input
              type="text"
              value={name}
              placeholder={`Nuevo ${itemLabel.toLowerCase()}`}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Detalle</span>
            <input
              type="text"
              value={detail}
              placeholder="Descripción corta"
              onChange={(event) => setDetail(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn">
              Guardar
            </button>
          </div>
        </form>
      </div>

      <div className="card placeholder-table">
        <div className="table-row header table-row-wide">
          <span>Nombre</span>
          <span>Detalle</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        {filteredItems.map((item) => (
          <div key={item.id} className="table-row table-row-wide">
            <span>{item.name}</span>
            <span>{item.detail}</span>
            <span>{item.status}</span>
            <span>
              <button type="button" className="link" onClick={() => toggleStatus(item.id)}>
                Cambiar estado
              </button>
              <button type="button" className="link" onClick={() => removeItem(item.id)}>
                Eliminar
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
