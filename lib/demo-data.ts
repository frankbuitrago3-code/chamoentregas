export type RequestType = "comida" | "paquete" | "mandado";
export type OrderStatus =
  | "nuevos"
  | "asignados"
  | "recogidos"
  | "en_camino"
  | "entregados"
  | "cancelados";

export type Order = {
  id: string;
  customerId?: string | null;
  client: string;
  phone: string;
  email?: string;
  city: string;
  rider: string;
  type: RequestType;
  status: OrderStatus;
  pickup: string;
  destination: string;
  details: string;
  priority: "normal" | "alta";
  createdAt: string;
};

export const requestOptions: Record<
  RequestType,
  { title: string; description: string; accent: string }
> = {
  comida: {
    title: "Pedir comida",
    description: "Llega directo del restaurante a tu puerta.",
    accent: "bg-[#0B347A]",
  },
  paquete: {
    title: "Enviar paquete",
    description: "Entrega rápida y segura de documentos o paquetes.",
    accent: "bg-[#FF5A0A]",
  },
  mandado: {
    title: "Hacer mandados",
    description: "Trae lo que necesites desde tiendas o puntos cercanos.",
    accent: "bg-amber-500",
  },
};

export const orderStatuses: Array<{ value: OrderStatus; label: string }> = [
  { value: "nuevos", label: "Nuevos" },
  { value: "asignados", label: "Asignados" },
  { value: "recogidos", label: "Recogidos" },
  { value: "en_camino", label: "En camino" },
  { value: "entregados", label: "Entregados" },
  { value: "cancelados", label: "Cancelados" },
];

export const statusMeta: Record<
  OrderStatus,
  { label: string; chip: string; dot: string }
> = {
  nuevos: {
    label: "Nuevos",
    chip: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  asignados: {
    label: "Asignados",
    chip: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  recogidos: {
    label: "Recogidos",
    chip: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  en_camino: {
    label: "En camino",
    chip: "bg-orange-100 text-orange-700",
    dot: "bg-[#FF5A0A]",
  },
  entregados: {
    label: "Entregados",
    chip: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelados: {
    label: "Cancelados",
    chip: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
};

export const demoOrders: Order[] = [
  {
    id: "CHR-1042",
    client: "María V.",
    phone: "0414-1234567",
    city: "Coloncito",
    rider: "José",
    type: "comida",
    status: "en_camino",
    pickup: "La Casona Grill",
    destination: "Calle 5, esquina 7",
    details: "2 arepas rellenas + 1 hamburguesa",
    priority: "alta",
    createdAt: "2026-10-14T08:40:00.000Z",
  },
  {
    id: "CHR-1038",
    client: "Luis R.",
    phone: "0424-7654321",
    city: "Coloncito",
    rider: "Luis",
    type: "paquete",
    status: "asignados",
    pickup: "Bodega Central",
    destination: "Residencias Los Pinos",
    details: "Caja pequeña con documentos",
    priority: "normal",
    createdAt: "2026-10-14T07:55:00.000Z",
  },
  {
    id: "CHR-1034",
    client: "Ana M.",
    phone: "0412-9876543",
    city: "Coloncito",
    rider: "Sin asignar",
    type: "mandado",
    status: "nuevos",
    pickup: "Panadería de la plaza",
    destination: "Urbanización El Progreso",
    details: "1 pan de queso y 2 leche de coco",
    priority: "normal",
    createdAt: "2026-10-14T07:22:00.000Z",
  },
  {
    id: "CHR-1029",
    client: "Carlos F.",
    phone: "0426-6543210",
    city: "Coloncito",
    rider: "Néstor",
    type: "comida",
    status: "entregados",
    pickup: "Pizzería 7 Sabores",
    destination: "Calle Bolívar",
    details: "1 pizza familiar + refrescos",
    priority: "normal",
    createdAt: "2026-10-13T20:10:00.000Z",
  },
  {
    id: "CHR-1022",
    client: "Diana T.",
    phone: "0416-3344551",
    city: "Coloncito",
    rider: "Sin asignar",
    type: "paquete",
    status: "cancelados",
    pickup: "Farmacia del centro",
    destination: "Casa de la señora Y.",
    details: "Pedido de medicamentos para entrega urgente",
    priority: "alta",
    createdAt: "2026-10-13T18:30:00.000Z",
  },
];

export const demoRiders = [
  { id: "r-1", name: "José", city: "Coloncito", active: true },
  { id: "r-2", name: "Luis", city: "Coloncito", active: true },
  { id: "r-3", name: "Néstor", city: "Coloncito", active: true },
  { id: "r-4", name: "Marcos", city: "La Fría", active: false },
];

export const demoCustomers = [
  { name: "María V.", phone: "0414-1234567", city: "Coloncito" },
  { name: "Luis R.", phone: "0424-7654321", city: "Coloncito" },
  { name: "Ana M.", phone: "0412-9876543", city: "Coloncito" },
  { name: "Carlos F.", phone: "0426-6543210", city: "Coloncito" },
];

export const demoCoverage = [
  { name: "Coloncito", status: "activa", area: "Centro comercial y barrios aledaños" },
  { name: "La Fría", status: "proxima", area: "Próxima apertura" },
  { name: "Colón", status: "proxima", area: "Próxima apertura" },
];
