import { useEffect, useState } from "react";
import { AdminUser, fetchUsers, updateUserPermissions } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";

export function UsersAdmin() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setIsLoading(true);
    fetchUsers(token)
      .then((response) => {
        setUsers(response);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar usuarios."))
      .finally(() => setIsLoading(false));
  }, [token]);

  const saveUser = async (user: AdminUser, nextRole: Role, nextIsActive: boolean) => {
    if (!token) return;
    try {
      const updated = await updateUserPermissions(token, user.id, {
        role: nextRole,
        is_active: nextIsActive
      });
      setUsers((current) => current.map((item) => (item.id === user.id ? updated : item)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el usuario.");
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Usuarios y permisos</h1>
          <p>Módulo administrador para editar rol y estado activo de cada usuario.</p>
        </div>
      </header>

      <div className="card placeholder-table">
        <div className="table-row header users-row">
          <span>Nombre</span>
          <span>Email</span>
          <span>Rol</span>
          <span>Activo</span>
        </div>

        {isLoading ? <p>Cargando usuarios...</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        {!isLoading && users.map((user) => (
          <div key={user.id} className="table-row users-row">
            <span>{user.name}</span>
            <span>{user.email}</span>
            <span>
              <select
                value={user.role}
                onChange={(event) => saveUser(user, event.target.value as Role, user.is_active)}
              >
                <option value={Role.ADMIN}>ADMIN</option>
                <option value={Role.OFFICE}>OFFICE</option>
                <option value={Role.READONLY}>READONLY</option>
              </select>
            </span>
            <span>
              <label className="inline-field">
                <input
                  type="checkbox"
                  checked={user.is_active}
                  onChange={(event) => saveUser(user, user.role, event.target.checked)}
                />
                <span>{user.is_active ? "Sí" : "No"}</span>
              </label>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

