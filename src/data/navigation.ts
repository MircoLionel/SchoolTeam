import { Role } from "../types/auth";

export const NAV_SECTIONS = [
  {
    label: "Inicio",
    links: [{ to: "/", label: "Dashboard" }]
  },
  {
    label: "Configuración",
    links: [
      { to: "/schools", label: "Escuelas", roles: [Role.ADMIN] },
      { to: "/grades", label: "Grados", roles: [Role.ADMIN] },
      { to: "/shifts", label: "Turnos", roles: [Role.ADMIN] },
      { to: "/contacts", label: "Contactos", roles: [Role.ADMIN] }
    ]
  },
  {
    label: "Operación",
    links: [
      { to: "/trips", label: "Viajes", roles: [Role.ADMIN, Role.OFFICE] },
      { to: "/budgets", label: "Presupuestos", roles: [Role.ADMIN] },
      { to: "/passengers", label: "Pasajeros", roles: [Role.ADMIN, Role.OFFICE] },
      { to: "/accounts", label: "Estado de cuenta", roles: [Role.ADMIN, Role.OFFICE] }
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
