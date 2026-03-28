import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { Grades } from "./pages/Grades";
import { Login } from "./pages/Login";
import { Budgets } from "./pages/Budgets";
import { Schools } from "./pages/Schools";
import { Shifts } from "./pages/Shifts";
import { Trips } from "./pages/Trips";
import { Role } from "./types/auth";
import { ModuleCrudPage } from "./pages/ModuleCrudPage";
import { Cashbox } from "./pages/Cashbox";
import { Passengers } from "./pages/Passengers";
import { Accounts } from "./pages/Accounts";
import { TripPassengers } from "./pages/TripPassengers";

const adminOnly = [Role.ADMIN];
const adminOffice = [Role.ADMIN, Role.OFFICE];
const allRoles = [Role.ADMIN, Role.OFFICE, Role.READONLY];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/trip-passengers" element={<TripPassengers />} />
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={allRoles}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="schools" element={<Schools />} />
        <Route path="grades" element={<Grades />} />
        <Route path="shifts" element={<Shifts />} />
        <Route
          path="contacts"
          element={
            <ModuleCrudPage
              moduleKey="contacts"
              title="Contactos"
              description="Gestión de contactos por escuela, grado y turno."
              itemLabel="Contacto"
            />
          }
        />
        <Route
          path="trips"
          element={<Trips />}
        />
        <Route
          path="budgets"
          element={<Budgets />}
        />
        <Route
          path="passengers"
          element={<Passengers />}
        />
        <Route
          path="coupons/collect"
          element={
            <ProtectedRoute allowedRoles={adminOffice} inline>
              <ModuleCrudPage
                moduleKey="coupons-collect"
                title="Cobro de cupón"
                description="Registro de cobros y control de cupones cobrados."
                itemLabel="Cobro"
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/non-cash"
          element={
            <ProtectedRoute allowedRoles={adminOffice} inline>
              <ModuleCrudPage
                moduleKey="payments-non-cash"
                title="Pago no efectivo"
                description="Transferencias y medios no efectivos con comprobantes."
                itemLabel="Pago"
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="accounts"
          element={<Accounts />}
        />
        <Route
          path="cashbox"
          element={
            <ProtectedRoute allowedRoles={adminOnly} inline>
              <Cashbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="providers"
          element={
            <ProtectedRoute allowedRoles={adminOnly} inline>
              <ModuleCrudPage
                moduleKey="providers"
                title="Proveedores"
                description="Control de proveedores y costos operativos."
                itemLabel="Proveedor"
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute allowedRoles={adminOnly} inline>
              <ModuleCrudPage
                moduleKey="audit"
                title="Auditoría"
                description="Registro de eventos críticos y trazabilidad."
                itemLabel="Evento"
              />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
