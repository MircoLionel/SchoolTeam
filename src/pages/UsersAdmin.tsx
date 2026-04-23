import { useEffect, useState } from "react";
import { AdminUser, createUser, fetchUsers, updateUserPermissions } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";

const USERS_FALLBACK_KEY = "schoolteam.admin.users.fallback";

function readFallbackUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(USERS_FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFallbackUsers(users: AdminUser[]) {
  localStorage.setItem(USERS_FALLBACK_KEY, JSON.stringify(users));
}

export function UsersAdmin() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>(Role.OFFICE);
  const [newUserActive, setNewUserActive] = useState(true);

  useEffect(() => {
    if (!token) return;

    setIsLoading(true);
    fetchUsers(token)
      .then((response) => {
        setUsers(response);
        saveFallbackUsers(response);
        setError(null);
      })
      .catch((err) => {
        const fallback = readFallbackUsers();
        if (fallback.length > 0) {
          setUsers(fallback);
          setError("Backend no disponible. Se muestran usuarios guardados localmente.");
          return;
        }

        setError(err instanceof Error ? err.message : "No se pudieron cargar usuarios.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const saveUser = async (user: AdminUser, nextRole: Role, nextIsActive: boolean) => {
    if (!token) return;
    try {
      const updated = await updateUserPermissions(token, user.id, {
        role: nextRole,
        is_active: nextIsActive
      });
      setUsers((current) => {
        const next = current.map((item) => (item.id === user.id ? updated : item));
        saveFallbackUsers(next);
        return next;
      });
      setError(null);
    } catch {
      setUsers((current) => {
        const next = current.map((item) => (
          item.id === user.id ? { ...item, role: nextRole, is_active: nextIsActive } : item
        ));
        saveFallbackUsers(next);
        return next;
      });
      setError("Backend no disponible. El cambio se guardó de forma local.");
    }
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    try {
      const created = await createUser(token, {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        is_active: newUserActive
      });
      setUsers((current) => {
        const next = [...current, created].sort((a, b) => a.name.localeCompare(b.name));
        saveFallbackUsers(next);
        return next;
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole(Role.OFFICE);
      setNewUserActive(true);
      setError(null);
    } catch {
      const fallbackUser: AdminUser = {
        id: Date.now(),
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        is_active: newUserActive,
        password_recovery: newUserPassword,
        created_at: new Date().toISOString()
      };
      setUsers((current) => {
        const next = [...current, fallbackUser].sort((a, b) => a.name.localeCompare(b.name));
        saveFallbackUsers(next);
        return next;
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole(Role.OFFICE);
      setNewUserActive(true);
      setError("Backend no disponible. El usuario se creó de forma local.");
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
        <form className="form-grid users-create-form" onSubmit={handleCreateUser}>
          <input
            placeholder="Nombre"
            value={newUserName}
            onChange={(event) => setNewUserName(event.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newUserEmail}
            onChange={(event) => setNewUserEmail(event.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Contraseña"
            value={newUserPassword}
            onChange={(event) => setNewUserPassword(event.target.value)}
            minLength={6}
            required
          />
          <select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value as Role)}>
            <option value={Role.ADMIN}>ADMIN</option>
            <option value={Role.OFFICE}>OFFICE</option>
            <option value={Role.READONLY}>READONLY</option>
          </select>
          <label className="inline-field">
            <input
              type="checkbox"
              checked={newUserActive}
              onChange={(event) => setNewUserActive(event.target.checked)}
            />
            <span>Activo</span>
          </label>
          <button className="btn btn-primary" type="submit">Crear usuario</button>
        </form>

        <div className="table-row header users-row">
          <span>Nombre</span>
          <span>Email</span>
          <span>Contraseña</span>
          <span>Rol</span>
          <span>Activo</span>
        </div>

        {isLoading ? <p>Cargando usuarios...</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        {!isLoading && users.map((user) => (
          <div key={user.id} className="table-row users-row">
            <span>{user.name}</span>
            <span>{user.email}</span>
            <span>{user.password_recovery || "-"}</span>
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
