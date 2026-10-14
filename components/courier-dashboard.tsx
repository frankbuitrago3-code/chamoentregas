"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LogOut,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Store,
  Truck,
} from "lucide-react";
import { demoOrders, type OrderStatus, type RequestType } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

type CourierProfile = {
  id: string;
  name: string;
  city: string;
  phone: string | null;
};

type CourierOrder = {
  id: string;
  client: string;
  phone: string;
  city: string;
  rider: string;
  type: RequestType;
  status: OrderStatus;
  pickup: string;
  destination: string;
  details: string;
  notes: string;
  createdAt: string;
};

const statusLabel: Record<OrderStatus, string> = {
  nuevos: "Disponible",
  asignados: "Asignado",
  recogidos: "Recogido",
  en_camino: "En camino",
  entregados: "Entregado",
  cancelados: "Cancelado",
};

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  asignados: "recogidos",
  recogidos: "en_camino",
  en_camino: "entregados",
};

const nextAction: Partial<Record<OrderStatus, string>> = {
  asignados: "Marcar como recogido",
  recogidos: "Iniciar entrega",
  en_camino: "Marcar como entregado",
};

const demoCredentials = {
  email: "repartidor@chamoentregas.com",
  password: "chamo123",
};

function getTypeLabel(type: RequestType) {
  switch (type) {
    case "comida":
      return "Comida";
    case "paquete":
      return "Paquete";
    case "mandado":
      return "Mandado";
  }
}

function mapSupabaseOrder(item: Record<string, unknown>): CourierOrder {
  const type =
    item.type === "comida" || item.type === "paquete" || item.type === "mandado"
      ? item.type
      : "mandado";
  const status: OrderStatus =
    item.status === "nuevos" ||
    item.status === "asignados" ||
    item.status === "recogidos" ||
    item.status === "en_camino" ||
    item.status === "entregados" ||
    item.status === "cancelados"
      ? item.status
      : "nuevos";

  return {
    id: String(item.id ?? "PEDIDO"),
    client: String(item.customer_name ?? "Cliente"),
    phone: String(item.customer_phone ?? ""),
    city: String(item.city ?? ""),
    rider: String(item.rider_name ?? ""),
    type,
    status,
    pickup: String(item.pickup_location ?? item.restaurant_name ?? "Punto de recogida"),
    destination: String(item.destination ?? "Destino por confirmar"),
    details: String(item.item_details ?? "Sin detalles"),
    notes: String(item.notes ?? ""),
    createdAt: String(item.created_at ?? new Date().toISOString()),
  };
}

function mapDemoOrder(order: (typeof demoOrders)[number]): CourierOrder {
  return {
    id: order.id,
    client: order.client,
    phone: order.phone,
    city: order.city,
    rider: order.rider,
    type: order.type,
    status: order.status,
    pickup: order.pickup,
    destination: order.destination,
    details: order.details,
    notes: "",
    createdAt: order.createdAt,
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CourierDashboard() {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [courier, setCourier] = useState<CourierProfile | null>(null);
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(supabase !== null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loginForm, setLoginForm] = useState(demoCredentials);
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<"disponibles" | "mis-entregas">(
    "disponibles",
  );

  const demoMode = supabase === null;
  const availableOrders = useMemo(
    () => orders.filter((order) => order.status === "nuevos"),
    [orders],
  );
  const myOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.rider === courier?.name &&
          ["asignados", "recogidos", "en_camino"].includes(order.status),
      ),
    [courier?.name, orders],
  );

  const loadOrders = useCallback(async () => {
    if (isDemo) {
      await Promise.resolve();
      setOrders(demoOrders.map(mapDemoOrder));
      setIsRefreshing(false);
      return;
    }

    const client = supabase;
    if (!client) return;
    const { data, error } = await client
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    setIsRefreshing(false);
    if (error) {
      console.error("No se pudieron cargar las entregas:", error);
      setErrorMessage(`No se pudieron cargar las entregas: ${error.message}`);
    } else {
      setErrorMessage("");
      setOrders((data ?? []).map((row: Record<string, unknown>) => mapSupabaseOrder(row)));
    }
    setIsRefreshing(false);
  }, [isDemo]);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("No se pudo recuperar la sesión del repartidor:", error);
        if (mounted) setLoginError(error.message);
      }
      if (mounted) {
        setSessionUser(data.session?.user ?? null);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      if (!session) {
        setCourier(null);
        setOrders([]);
        setIsDemo(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionUser || !supabase) return;

    let mounted = true;
    const client = supabase;
    const loadCourierProfile = async () => {
      if (sessionUser.app_metadata.role !== "courier") {
        await client.auth.signOut();
        if (mounted) {
          setLoginError("Esta cuenta no tiene permisos de repartidor.");
          setSessionUser(null);
        }
        return;
      }

      const { data, error } = await client
        .from("couriers")
        .select("id, name, city, phone")
        .eq("auth_user_id", sessionUser.id)
        .eq("active", true)
        .maybeSingle();

      if (error || !data) {
        if (error) console.error("No se pudo cargar el perfil:", error);
        await client.auth.signOut();
        if (mounted) {
          setLoginError(
            error?.message ??
              "Esta cuenta aún no está asociada a un repartidor activo.",
          );
          setSessionUser(null);
        }
        return;
      }

      if (mounted) {
        setCourier({
          id: String(data.id),
          name: String(data.name),
          city: String(data.city),
          phone: data.phone ? String(data.phone) : null,
        });
        setIsDemo(false);
      }
    };

    void loadCourierProfile();
    return () => {
      mounted = false;
    };
  }, [sessionUser, isDemo]);

  useEffect(() => {
    if (!courier && !isDemo) return;
    queueMicrotask(() => void loadOrders());

    if (isDemo || !supabase) return;
    const client = supabase;
    const subscription = client
      .channel("courier-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void loadOrders(),
      )
      .subscribe();

    return () => {
      void client.removeChannel(subscription);
    };
  }, [courier, isDemo, loadOrders]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");

    if (demoMode) {
      if (
        loginForm.email !== demoCredentials.email ||
        loginForm.password !== demoCredentials.password
      ) {
        setLoginError("Credenciales demo incorrectas.");
        return;
      }

      setCourier({
        id: "demo-jose",
        name: "José",
        city: "Coloncito",
        phone: "0414-1234567",
      });
      setIsDemo(true);
      setOrders(demoOrders.map(mapDemoOrder));
      return;
    }

    if (!supabase) return;
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(loginForm);
    setIsLoading(false);

    if (error) {
      setLoginError(error.message);
      return;
    }

    setSessionUser(data.user);
    setIsDemo(false);
    setActiveTab("disponibles");
  }

  async function handleSignOut() {
    if (isDemo) {
      setIsDemo(false);
      setCourier(null);
      setOrders([]);
      return;
    }

    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("No se pudo cerrar la sesión:", error);
      setErrorMessage(`No se pudo cerrar la sesión: ${error.message}`);
    }
  }

  async function acceptOrder(order: CourierOrder) {
    if (isDemo) {
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, rider: courier?.name ?? "José", status: "asignados" }
            : item,
        ),
      );
      setActiveTab("mis-entregas");
      return;
    }

    if (!supabase) return;
    setBusyOrderId(order.id);
    setErrorMessage("");
    const { error } = await supabase.rpc("courier_accept_order", {
      p_order_id: order.id,
    });
    setBusyOrderId("");

    if (error) {
      console.error("No se pudo aceptar la entrega:", error);
      setErrorMessage(error.message);
      return;
    }

    await loadOrders();
    setActiveTab("mis-entregas");
  }

  async function advanceOrder(order: CourierOrder) {
    const status = nextStatus[order.status];
    if (!status) return;

    if (isDemo) {
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, status } : item,
        ),
      );
      return;
    }

    if (!supabase) return;
    setBusyOrderId(order.id);
    setErrorMessage("");
    const { error } = await supabase.rpc("courier_update_order_status", {
      p_order_id: order.id,
      p_new_status: status,
    });
    setBusyOrderId("");

    if (error) {
      console.error("No se pudo actualizar la entrega:", error);
      setErrorMessage(error.message);
      return;
    }

    await loadOrders();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-4">
        <p className="font-semibold text-[#0B347A]">Cargando panel del repartidor…</p>
      </main>
    );
  }

  if (!courier && !isDemo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-4 py-8">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(11,52,122,0.12)] sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <Image
              src="/brand/logo-mascota.svg"
              alt="ChamoEntregas"
              width={60}
              height={60}
              className="h-[60px] w-[60px] rounded-2xl"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF5A0A]">
                Acceso de equipo
              </p>
              <h1 className="text-2xl font-black text-[#0B347A]">Repartidor</h1>
            </div>
          </div>

          <p className="mb-6 text-sm text-slate-600">
            Inicia sesión para revisar entregas disponibles y actualizar tus pedidos.
          </p>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Correo</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, email: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
              placeholder="repartidor@chamoentregas.com"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, password: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
            />
          </label>

          {loginError ? (
            <p role="alert" className="mb-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
              {loginError}
            </p>
          ) : null}

          {demoMode ? (
            <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
              Modo demo: {demoCredentials.email} / {demoCredentials.password}. Los cambios no se guardan.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-[#FF5A0A] px-5 py-3.5 font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-[#e75408] disabled:opacity-60"
          >
            {isLoading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </main>
    );
  }

  const displayedOrders =
    activeTab === "disponibles" ? availableOrders : myOrders;

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-10">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-mascota.svg"
              alt="ChamoEntregas"
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl"
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Repartidor
              </p>
              <p className="font-black text-[#0B347A]">ChamoEntregas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            aria-label="Cerrar sesión"
            className="rounded-full p-3 text-slate-600 transition hover:bg-slate-100"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-5">
        <section className="rounded-[28px] bg-[#0B347A] p-5 text-white shadow-lg shadow-blue-200 sm:p-6">
          <p className="text-sm font-medium text-blue-100">Hola, {courier?.name ?? "José"} 👋</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Tus entregas de hoy</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-blue-100">
            <MapPin className="h-4 w-4 text-[#FF5A0A]" />
            {courier?.city ?? "Coloncito"}
          </p>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-5 w-5 text-[#FF5A0A]" />
              {myOrders.length} entrega{myOrders.length === 1 ? "" : "s"} activa
              {myOrders.length === 1 ? "" : "s"}
            </div>
            <button
              type="button"
              onClick={() => void loadOrders()}
              disabled={isRefreshing}
              aria-label="Actualizar entregas"
              className="rounded-full p-2 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </section>

        {isDemo ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Estás viendo datos de prueba. Las acciones no se guardan en Supabase.
          </p>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 rounded-2xl bg-slate-200 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("disponibles")}
            className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
              activeTab === "disponibles"
                ? "bg-white text-[#0B347A] shadow-sm"
                : "text-slate-600"
            }`}
          >
            Disponibles ({availableOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mis-entregas")}
            className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
              activeTab === "mis-entregas"
                ? "bg-white text-[#0B347A] shadow-sm"
                : "text-slate-600"
            }`}
          >
            Mis entregas ({myOrders.length})
          </button>
        </div>

        <section className="mt-5 space-y-4">
          {displayedOrders.map((order) => {
            const isAvailable = order.status === "nuevos";
            const actionLabel = nextAction[order.status];

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-[#0B347A]">
                        #{order.id.length > 12 ? order.id.slice(0, 8) : order.id}
                      </span>
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#FF5A0A]">
                        {getTypeLabel(order.type)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {order.details}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      isAvailable
                        ? "bg-sky-100 text-sky-700"
                        : order.status === "en_camino"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    {statusLabel[order.status]}
                  </span>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <Store className="h-5 w-5 text-[#0B347A]" />
                      <span className="my-1 h-5 border-l border-dashed border-slate-300" />
                      <MapPin className="h-5 w-5 text-[#FF5A0A]" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Recoger · {formatTime(order.createdAt)}
                        </p>
                        <p className="mt-0.5 font-semibold text-slate-900">{order.pickup}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Entregar en
                        </p>
                        <p className="mt-0.5 font-semibold text-slate-900">
                          {order.destination}, {order.city}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Cliente
                      </p>
                      <p className="mt-0.5 font-semibold text-slate-900">{order.client}</p>
                    </div>
                    {order.phone ? (
                      <a
                        href={`tel:${order.phone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-[#0B347A] shadow-sm"
                      >
                        <Phone className="h-4 w-4" />
                        Llamar
                      </a>
                    ) : null}
                  </div>

                  {order.notes ? (
                    <p className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                      Nota: {order.notes}
                    </p>
                  ) : null}

                  {isAvailable ? (
                    <button
                      type="button"
                      disabled={busyOrderId === order.id}
                      onClick={() => void acceptOrder(order)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FF5A0A] px-4 py-3.5 font-bold text-white shadow-lg shadow-orange-100 transition hover:bg-[#e75408] disabled:opacity-60"
                    >
                      {busyOrderId === order.id ? "Aceptando…" : "Aceptar entrega"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : actionLabel ? (
                    <button
                      type="button"
                      disabled={busyOrderId === order.id}
                      onClick={() => void advanceOrder(order)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0B347A] px-4 py-3.5 font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-[#092b66] disabled:opacity-60"
                    >
                      {busyOrderId === order.id ? "Actualizando…" : actionLabel}
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Entrega finalizada
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {displayedOrders.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              {activeTab === "disponibles" ? (
                <Clock3 className="mx-auto h-8 w-8 text-slate-400" />
              ) : (
                <Package className="mx-auto h-8 w-8 text-slate-400" />
              )}
              <h2 className="mt-3 font-bold text-slate-800">
                {activeTab === "disponibles"
                  ? "No hay pedidos nuevos por ahora"
                  : "Todavía no tienes entregas asignadas"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeTab === "disponibles"
                  ? "Te avisaremos cuando llegue uno para tu zona."
                  : "Acepta un pedido disponible para verlo aquí."}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
