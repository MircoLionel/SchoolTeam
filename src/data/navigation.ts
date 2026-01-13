import { Role } from "../types/auth";

export const NAV_SECTIONS = [
  {
    label: "Inicio",
    links: [{ to: "/", label: "Dashboard" }]
  },
  {
    label: "Configuración",
    links: [
      { to: "/schools", label: "Escuelas" },
      { to: "/grades", label: "Grados" },
      { to: "/shifts", label: "Turnos" },
      { to: "/contacts", label: "Contactos" }
    ]
  },
  {
    label: "Operación",
    links: [
      { to: "/trips", label: "Viajes" },
      { to: "/budgets", label: "Presupuestos" },
      { to: "/passenger-types", label: "Tipos de pasajero" },
      { to: "/guardians", label: "Responsables" },
      { to: "/passengers", label: "Pasajeros" },
      { to: "/installments", label: "Plan de cuotas" },
      { to: "/checkbooks", label: "Chequeras" },
      { to: "/accounts", label: "Estado de cuenta" }
    ]
  },
  {
    label: "Cobros",
    links: [
      { to: "/coupons/collect", label: "Cobro de cupón", roles: [Role.ADMIN, Role.OFFICE] },
      { to: "/payments/non-cash", label: "Pago no efectivo", roles: [Role.ADMIN, Role.OFFICE] }
    ]
  },
  {
    label: "Administración",
    links: [
      { to: "/cashbox", label: "Caja", roles: [Role.ADMIN] },
      { to: "/providers", label: "Proveedores", roles: [Role.ADMIN] },
      { to: "/audit", label: "Auditoría", roles: [Role.ADMIN] }
    ]
  }
];
