import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  inline?: boolean;
}

export function ProtectedRoute({ allowedRoles, children, inline = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="card">
        <h2>Verificando sesión</h2>
        <p>Estamos cargando tu perfil y permisos.</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return inline ? (
      <div className="card">
        <h2>Acceso restringido</h2>
        <p>Tu perfil no tiene permisos para acceder a este módulo.</p>
      </div>
    ) : (
      <Navigate to="/" replace />
    );
  }

  return <>{children}</>;
}
