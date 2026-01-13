import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";

export function Login() {
  const { loginAs } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: Role) => {
    loginAs(role);
    navigate("/", { replace: true });
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1>School Team Turismo</h1>
        <p>Ingreso al panel operativo (demo sin backend).</p>
        <div className="login-actions">
          <button type="button" className="btn" onClick={() => handleLogin(Role.ADMIN)}>
            Ingresar como Admin
          </button>
          <button type="button" className="btn" onClick={() => handleLogin(Role.OFFICE)}>
            Ingresar como Oficina
          </button>
          <button type="button" className="btn" onClick={() => handleLogin(Role.READONLY)}>
            Ingresar como Solo Lectura
          </button>
        </div>
      </div>
    </div>
  );
}
