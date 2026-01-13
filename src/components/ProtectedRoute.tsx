import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  inline?: boolean;
}

export function ProtectedRoute({ allowedRoles, children, inline = false }: ProtectedRouteProps) {
  const { user } = useAuth();

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
