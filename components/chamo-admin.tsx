"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  Filter,
  MapPinned,
  PackageCheck,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { demoCoverage, demoCustomers, demoOrders, demoRiders, orderStatuses, statusMeta, type Order, type OrderStatus } from "@/lib/demo-data";
import { getSupabaseClient } from "@/lib/supabase";

const demoCredentials = {
  email: "admin@chamoentregas.com",
  password: "chamo123",
};

export function ChamoAdminDashboard() {
  const supabaseClient = getSupabaseClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginForm, setLoginForm] = useState(() => ({
    email: supabaseClient ? "" : demoCredentials.email,
    password: supabaseClient ? "" : demoCredentials.password,
  }));
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | "todos">("todos");
  const [selectedOrderId, setSelectedOrderId] = useState(demoOrders[0]?.id ?? "");

  const filteredOrders = useMemo(() => {
    if (activeFilter === "todos") return orders;
    return orders.filter((order) => order.status === activeFilter);
  }, [activeFilter, orders]);

  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;

  useEffect(() => {
    if (!isLoggedIn) return;

    const client = supabaseClient;
    if (!client) return;

    const loadOrders = async () => {
      const { data, error } = await client
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("No se pudieron cargar los pedidos:", error);
        return;
      }

      if (!data) return;
      const mapped = data.map((item: Record<string, unknown>) => {
        const typeValue = typeof item.type === "string" ? item.type : "mandado";
        const statusValue = typeof item.status === "string" ? item.status : "nuevos";
        const priorityValue = typeof item.priority === "string" ? item.priority : "normal";

        return {
          id: String(item.id ?? item.order_id ?? "GEN"),
          client: String(item.customer_name ?? "Cliente"),
          phone: String(item.customer_phone ?? "--"),
          city: String(item.city ?? "Coloncito"),
          rider: String(item.rider_name ?? "Sin asignar"),
          type: typeValue as Order["type"],
          status: statusValue as Order["status"],
          pickup: String(item.pickup_location ?? item.restaurant_name ?? "Punto de recogida"),
          destination: String(item.destination ?? item.delivery_address ?? "Destino"),
          details: String(item.item_details ?? item.notes ?? "Pedido"),
          priority: priorityValue as Order["priority"],
          createdAt: String(item.created_at ?? new Date().toISOString()),
        };
      });

      setOrders(mapped);
      if (mapped.length > 0) {
        setSelectedOrderId((prev) => prev || mapped[0].id);
      }
    };

    loadOrders();

    const subscription = client
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          loadOrders();
          const nextId =
            payload.new && typeof payload.new === "object" && "id" in payload.new
              ? String((payload.new as Record<string, unknown>).id ?? "")
              : "";
          setSelectedOrderId((current) => current || nextId);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(subscription);
    };
  }, [isLoggedIn, supabaseClient]);

  const stats = [
    {
      label: "Nuevos",
      value: orders.filter((order) => order.status === "nuevos").length,
      icon: ClipboardList,
      color: "text-sky-600",
    },
    {
      label: "Asignados",
      value: orders.filter((order) => order.status === "asignados").length,
      icon: PackageCheck,
      color: "text-violet-600",
    },
    {
      label: "En camino",
      value: orders.filter((order) => order.status === "en_camino").length,
      icon: Truck,
      color: "text-[#FF5A0A]",
    },
    {
      label: "Entregados",
      value: orders.filter((order) => order.status === "entregados").length,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
  ];

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = supabaseClient;

    if (client) {
      const { error } = await client.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        setLoginError(error.message);
        return;
      }

      const { data: sessionData } = await client.auth.getSession();
      if (sessionData.session?.user.app_metadata.role !== "admin") {
        await client.auth.signOut();
        setLoginError("Esta cuenta no tiene permisos de administrador.");
        return;
      }

      setIsLoggedIn(true);
      setLoginError("");
      return;
    }

    if (
      loginForm.email === demoCredentials.email &&
      loginForm.password === demoCredentials.password
    ) {
      setIsLoggedIn(true);
      setLoginError("");
      return;
    }

    setLoginError("Credenciales inválidas. Usa admin@chamoentregas.com / chamo123");
  }

  async function changeOrderStatus(orderId: string, newStatus: OrderStatus) {
    const client = getSupabaseClient();

    if (client) {
      const { error } = await client
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) {
        console.error("No se pudo actualizar el estado:", error);
        return;
      }
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, status: newStatus }
          : order,
      ),
    );
  }

  async function assignRider(orderId: string, riderName: string) {
    const client = getSupabaseClient();

    if (client) {
      const { error } = await client
        .from("orders")
        .update({ rider_name: riderName, status: "asignados" })
        .eq("id", orderId);

      if (error) {
        console.error("No se pudo asignar el repartidor:", error);
        return;
      }
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, rider: riderName, status: "asignados" }
          : order,
      ),
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(11,52,122,0.12)]">
          <div className="bg-[#0B347A] px-6 py-8 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-blue-100">Panel</p>
                <h1 className="text-2xl font-black">ChamoEntregas</h1>
              </div>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5 p-6">
            <div>
              <p className="text-sm font-semibold text-slate-500">Inicio de sesión</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">Acceso administrativo</h2>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Correo</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Contraseña</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, password: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
              />
            </label>

            {loginError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {loginError}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#FF5A0A] px-4 py-3 font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105"
            >
              Entrar al panel
            </button>

            <p className="text-xs text-slate-500">
              {supabaseClient
                ? "Acceso solo para cuentas autorizadas del equipo."
                : `Demo local: ${demoCredentials.email} / ${demoCredentials.password}`}
            </p>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-mascota.svg" alt="Logo ChamoEntregas" width={60} height={60} className="h-[60px] w-[60px] rounded-2xl object-cover" />
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Operación</p>
              <h1 className="text-xl font-black text-[#0B347A]">ChamoEntregas</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLoggedIn(false)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <section className="mb-6 grid gap-4 md:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{label}</span>
                <div className={`rounded-2xl bg-slate-100 p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900">{value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Pedidos</p>
                <h2 className="text-2xl font-black text-slate-900">Tabla de pedidos</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600">
                <Filter className="h-4 w-4" />
                <span>Filtro</span>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { value: "todos", label: "Todos" },
                ...orderStatuses,
              ].map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setActiveFilter(status.value as OrderStatus | "todos")}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    activeFilter === status.value
                      ? "bg-[#0B347A] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Pedido</th>
                    <th className="px-3 py-3 font-semibold">Cliente</th>
                    <th className="px-3 py-3 font-semibold">Tipo</th>
                    <th className="px-3 py-3 font-semibold">Estado</th>
                    <th className="px-3 py-3 font-semibold">Rider</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${
                        selectedOrder?.id === order.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="px-3 py-3 font-bold text-[#0B347A]">{order.id}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold">{order.client}</div>
                        <div className="text-xs text-slate-500">{order.phone}</div>
                      </td>
                      <td className="px-3 py-3 capitalize">{order.type}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta[order.status].chip}`}>
                          {statusMeta[order.status].label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{order.rider}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            {selectedOrder ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Detalle</p>
                    <h3 className="text-xl font-black text-slate-900">{selectedOrder.id}</h3>
                  </div>
                  <div className="rounded-full bg-[#fff4ed] px-3 py-1 text-sm font-semibold text-[#FF5A0A]">
                    {selectedOrder.type}
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Cliente</div>
                    <div className="mt-1 font-bold text-slate-900">{selectedOrder.client}</div>
                    <div>{selectedOrder.phone}</div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPinned className="mt-0.5 h-4 w-4 text-[#0B347A]" />
                    <div>
                      <div className="font-semibold text-slate-900">Recoger</div>
                      <div>{selectedOrder.pickup}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ArrowUpRight className="mt-0.5 h-4 w-4 text-[#FF5A0A]" />
                    <div>
                      <div className="font-semibold text-slate-900">Destino</div>
                      <div>{selectedOrder.destination}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-200 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Detalles</div>
                    <div className="mt-1 font-medium text-slate-700">{selectedOrder.details}</div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Estado
                      <select
                        value={selectedOrder.status}
                        onChange={(event) =>
                          changeOrderStatus(selectedOrder.id, event.target.value as OrderStatus)
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-[#0B347A]"
                      >
                        {orderStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-slate-700">
                      Asignar repartidor
                      <select
                        defaultValue={selectedOrder.rider === "Sin asignar" ? "" : selectedOrder.rider}
                        onChange={(event) =>
                          assignRider(selectedOrder.id, event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-[#0B347A]"
                      >
                        <option value="">Sin asignar</option>
                        {demoRiders.map((rider) => (
                          <option key={rider.id} value={rider.name}>
                            {rider.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-500">Selecciona un pedido</div>
            )}
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-[#0B347A]/10 p-2 text-[#0B347A]">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Clientes</h3>
            </div>
            <div className="space-y-3">
              {demoCustomers.map((customer) => (
                <div key={customer.phone} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <div>
                    <div className="font-semibold text-slate-800">{customer.name}</div>
                    <div className="text-xs text-slate-500">{customer.phone}</div>
                  </div>
                  <CircleUserRound className="h-5 w-5 text-slate-400" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-[#FF5A0A]/10 p-2 text-[#FF5A0A]">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Repartidores</h3>
            </div>
            <div className="space-y-3">
              {demoRiders.map((rider) => (
                <div key={rider.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <div>
                    <div className="font-semibold text-slate-800">{rider.name}</div>
                    <div className="text-xs text-slate-500">{rider.city}</div>
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full ${rider.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                <MapPinned className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Cobertura</h3>
            </div>
            <div className="space-y-3">
              {demoCoverage.map((zone) => (
                <div key={zone.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-800">{zone.name}</div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                        zone.status === "activa"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {zone.status === "activa" ? "Activa" : "Próxima"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{zone.area}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
