import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export function Login() {
  const { login, error, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError("Ingresá tu email y contraseña.");
      return;
    }

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>School Team Turismo</h1>
        <p>Accedé con tu usuario de la plataforma.</p>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            placeholder="admin@schoolteam.turismo"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {(formError ?? error) && <p className="form-error">{formError ?? error}</p>}
        <button type="submit" className="btn" disabled={isLoading}>
          {isLoading ? "Ingresando..." : "Ingresar"}
        </button>
        <p className="login-hint">Usá el usuario creado en el backend (seed admin por defecto).</p>
      </form>
    </div>
  );
}
