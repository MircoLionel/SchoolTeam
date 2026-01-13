interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <button type="button" className="btn">
          Nuevo
        </button>
      </header>

      <div className="card">
        <p>
          Esta pantalla está lista para integrarse con la API REST (Laravel + Sanctum). Aquí se
          cargarán los datos con filtros por DNI, nombre y estado.
        </p>
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Campo</span>
            <span>Detalle</span>
            <span>Acciones</span>
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="table-row">
              <span>Registro {index + 1}</span>
              <span>Descripción breve</span>
              <span>
                <button type="button" className="link">
                  Ver
                </button>
                <button type="button" className="link">
                  Editar
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
