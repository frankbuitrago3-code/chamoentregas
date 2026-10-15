"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import type { OrderStatus, RequestType } from "@/lib/demo-data";

type CustomerProfileRecord = {
  full_name: string;
  phone: string | null;
  reputation_score: number;
  orders_blocked_until: string | null;
};

type CustomerOrder = {
  id: string;
  type: RequestType;
  status: OrderStatus;
  destination: string;
  created_at: string;
};

type CustomerViolation = {
  id: string;
  order_id: string;
  evidence_summary: string;
  points_deducted: number;
  created_at: string;
};

export function CustomerProfile() {
  const client = getSupabaseClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfileRecord | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [violations, setViolations] = useState<CustomerViolation[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState(
    client ? "" : "No se pudo conectar con el sistema de cuentas.",
  );
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(client !== null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!client) {
      return;
    }

    let isMounted = true;
    const load = async (currentUser: User | null) => {
      if (!isMounted) return;
      setUser(currentUser);
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      const [profileResult, orderResult, violationResult] = await Promise.all([
        client.from("customer_profiles").select("full_name,phone,reputation_score,orders_blocked_until").eq("id", currentUser.id).single(),
        client.from("orders").select("id,type,status,destination,created_at").eq("customer_id", currentUser.id).order("created_at", { ascending: false }).limit(20),
        client.from("customer_violations").select("id,order_id,evidence_summary,points_deducted,created_at").eq("customer_id", currentUser.id).order("created_at", { ascending: false }),
      ]);

      if (!isMounted) return;
      if (profileResult.error) setErrorMessage(profileResult.error.message);
      else if (profileResult.data) {
        setProfile(profileResult.data);
        setFullName(profileResult.data.full_name);
        setPhone(profileResult.data.phone ?? "");
      }
      if (orderResult.error) setErrorMessage(orderResult.error.message);
      else setOrders(orderResult.data ?? []);
      if (violationResult.error) setErrorMessage(violationResult.error.message);
      else setViolations(violationResult.data ?? []);
      setIsLoading(false);
    };

    client.auth.getSession().then(({ data, error }) => {
      if (error && isMounted) setErrorMessage(error.message);
      void load(data.session?.user ?? null);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        void load(session?.user ?? null);
      }, 0);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    if (!client || !user) return;

    setIsSaving(true);
    const { data, error } = await client
      .from("customer_profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", user.id)
      .select("full_name,phone,reputation_score,orders_blocked_until")
      .single();

    if (error) setErrorMessage(`No se pudo guardar el perfil: ${error.message}`);
    else {
      setProfile(data);
      setNotice("Perfil actualizado.");
    }
    setIsSaving(false);
  }

  async function handleSignOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) setErrorMessage(`No se pudo cerrar sesión: ${error.message}`);
    else router.push("/");
  }

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] text-[#0B347A]">Cargando tu perfil…</main>;
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-4">
        <section className="max-w-md rounded-[28px] bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-black text-[#0B347A]">Inicia sesión para ver tu perfil</h1>
          <Link href="/cuenta" className="mt-5 inline-block rounded-full bg-[#FF5A0A] px-6 py-3 font-bold text-white">Ir a mi cuenta</Link>
        </section>
      </main>
    );
  }

  const isBlocked = Boolean(profile?.orders_blocked_until && new Date(profile.orders_blocked_until) > new Date());

  return (
    <main className="min-h-screen bg-[#fffaf4] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/brand/logo-mascota.svg" alt="ChamoEntregas" width={52} height={52} className="h-13 w-13 rounded-2xl" />
            <span className="text-xl font-black text-[#0B347A]">Mi cuenta</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/#solicitud-rapida" className="rounded-full bg-[#0B347A] px-4 py-2.5 text-sm font-bold text-white">Pedir entrega</Link>
            <button type="button" onClick={() => void handleSignOut()} className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Salir</button>
          </div>
        </header>

        {errorMessage ? <p role="alert" className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{errorMessage}</p> : null}
        {isBlocked ? (
          <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Las nuevas solicitudes están pausadas hasta {new Date(profile!.orders_blocked_until!).toLocaleString("es-VE")}. Contacta a ChamoEntregas si necesitas revisar esta medida.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-black text-[#0B347A]">Tu perfil</h1>
            <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
            <div className="mt-5 rounded-2xl bg-blue-50 p-4">
              <div className="text-sm font-semibold text-slate-600">Reputación</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#0B347A]">{profile?.reputation_score ?? 100}</span>
                <span className="font-semibold text-slate-500">/ 100</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Empiezas con 100 puntos. Solo el administrador puede confirmar impagos con evidencia; cada caso confirmado resta 20 puntos.
              </p>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre</span>
                <input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#0B347A]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Teléfono (opcional)</span>
                <input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#0B347A]" placeholder="Puedes dejarlo vacío" />
              </label>
              {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
              <button type="submit" disabled={isSaving} className="w-full rounded-2xl bg-[#FF5A0A] px-4 py-3 font-bold text-white disabled:opacity-60">{isSaving ? "Guardando…" : "Guardar perfil"}</button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-[#0B347A]">Tus pedidos</h2>
              {orders.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">Todavía no tienes pedidos. Cuando envíes una solicitud, aparecerá aquí.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {orders.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <div>
                        <div className="font-bold capitalize text-slate-900">{order.type} · {new Date(order.created_at).toLocaleDateString("es-VE")}</div>
                        <div className="text-slate-500">{order.destination}</div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{order.status.replaceAll("_", " ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-[#0B347A]">Incidencias confirmadas</h2>
              {violations.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">No tienes incidencias confirmadas.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {violations.map((violation) => (
                    <li key={violation.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                      <div className="font-bold text-amber-950">Impago confirmado · −{violation.points_deducted} puntos</div>
                      <p className="mt-1 text-amber-900">Pedido: {violation.order_id}</p>
                      <p className="mt-1 text-amber-900">{violation.evidence_summary}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
