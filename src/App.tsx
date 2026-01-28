import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Budgets } from "./pages/Budgets";
import { PagePlaceholder } from "./pages/PagePlaceholder";
import { PassengerTypes } from "./pages/PassengerTypes";
import { Schools } from "./pages/Schools";
import { Role } from "./types/auth";

const adminOnly = [Role.ADMIN];
const adminOffice = [Role.ADMIN, Role.OFFICE];
const allRoles = [Role.ADMIN, Role.OFFICE, Role.READONLY];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={allRoles}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="schools"
          element={<Schools />}
        />
        <Route
          path="grades"
          element={<PagePlaceholder title="Grados" description="ABM de grados." />}
        />
        <Route
          path="shifts"
          element={<PagePlaceholder title="Turnos" description="ABM de turnos." />}
        />
        <Route
          path="contacts"
          element={
            <PagePlaceholder title="Contactos" description="ABM de contactos por escuela+grado+turno." />
          }
        />
        <Route
          path="trips"
          element={<PagePlaceholder title="Viajes" description="ABM + asignación de turnos." />}
        />
        <Route
          path="budgets"
          element={<Budgets />}
        />
        <Route
          path="passenger-types"
          element={<PassengerTypes />}
        />
        <Route
          path="guardians"
          element={<PagePlaceholder title="Responsables" description="ABM de responsables." />}
        />
        <Route
          path="passengers"
          element={<PagePlaceholder title="Pasajeros" description="ABM de pasajeros." />}
        />
        <Route
          path="installments"
          element={<PagePlaceholder title="Plan de cuotas" description="Generación y edición de cuotas." />}
        />
        <Route
          path="checkbooks"
          element={<PagePlaceholder title="Chequeras" description="Generación e impresión PDF." />}
        />
        <Route
          path="coupons/collect"
          element={
            <ProtectedRoute allowedRoles={adminOffice} inline>
              <PagePlaceholder
                title="Cobro de cupón"
                description="Escaneo de barcode, cobro efectivo y ajustes."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/non-cash"
          element={
            <ProtectedRoute allowedRoles={adminOffice} inline>
              <PagePlaceholder
                title="Pago no efectivo"
                description="Registro de transferencias/MP + Comprobante X."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="accounts"
          element={<PagePlaceholder title="Estado de cuenta" description="Resumen por pasajero." />}
        />
        <Route
          path="cashbox"
          element={
            <ProtectedRoute allowedRoles={adminOnly} inline>
              <PagePlaceholder title="Caja" description="Ingresos, egresos y reportes." />
            </ProtectedRoute>
          }
        />
        <Route
          path="providers"
          element={
            <ProtectedRoute allowedRoles={adminOnly} inline>
              <PagePlaceholder title="Proveedores" description="Costos y ganancias por viaje." />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute allowedRoles={adminOnly} inline>
              <PagePlaceholder title="Auditoría" description="Log de acciones críticas." />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
