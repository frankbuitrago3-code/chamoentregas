"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Bike } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { requestOptions, type RequestType } from "@/lib/demo-data";
import { getSupabaseClient } from "@/lib/supabase";

const initialForm = {
  name: "",
  phone: "",
  address: "",
  city: "Coloncito",
  restaurant: "",
  item: "",
  notes: "",
  packageName: "",
  packageSize: "",
  photoName: "",
};

function getRequestType(value: string | null): RequestType {
  return value === "paquete" || value === "mandado" ? value : "comida";
}

export function CustomerOrderForm({ initialRequestType }: { initialRequestType: RequestType }) {
  const client = getSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(client));
  const [requestType, setRequestType] = useState<RequestType>(() =>
    getRequestType(searchParams.get("tipo") ?? initialRequestType),
  );
  const [formState, setFormState] = useState(initialForm);
  const [isOrderBlocked, setIsOrderBlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    client ? "" : "La conexión con el sistema de pedidos no está configurada.",
  );
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!client) return;

    let isMounted = true;
    const loadUser = async (nextUser: User | null) => {
      if (!isMounted) return;
      if (!nextUser) {
        router.replace(`/cuenta?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      setUser(nextUser);
      const { data, error } = await client
        .from("customer_profiles")
        .select("full_name,phone,orders_blocked_until")
        .eq("id", nextUser.id)
        .single();

      if (!isMounted) return;
      if (error) {
        setErrorMessage(`No se pudo cargar tu perfil: ${error.message}`);
        setIsCheckingSession(false);
        return;
      }

      setFormState((current) => ({
        ...current,
        name: data.full_name,
        phone: data.phone ?? "",
      }));
      setIsOrderBlocked(
        Boolean(data.orders_blocked_until && new Date(data.orders_blocked_until) > new Date()),
      );
      setIsCheckingSession(false);
    };

    client.auth.getSession().then(({ data, error }) => {
      if (error && isMounted) {
        setErrorMessage(`No se pudo verificar tu cuenta: ${error.message}`);
        setIsCheckingSession(false);
        return;
      }
      void loadUser(data.session?.user ?? null);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void loadUser(session?.user ?? null), 0);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [client, router]);

  function changeField(field: keyof typeof formState, value: string) {
    setFormState((current) => ({ ...current, [field]: value }));
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!client || !user) {
      setErrorMessage("Inicia sesión con tu cuenta de cliente antes de solicitar.");
      return;
    }
    if (isOrderBlocked) {
      setErrorMessage("Tu cuenta tiene temporalmente pausadas las nuevas solicitudes. Contacta a soporte.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      customer_name: formState.name,
      customer_phone: formState.phone.trim() || null,
      city: formState.city,
      type: requestType,
      status: "nuevos",
      pickup_location: requestType === "comida" ? formState.restaurant : formState.address,
      destination: formState.address,
      item_details:
        requestType === "comida"
          ? formState.item || formState.notes
          : requestType === "paquete"
            ? `${formState.packageName} • ${formState.packageSize}`
            : formState.item,
      notes: formState.notes,
      photo_url: formState.photoName || null,
    };

    try {
      const { error } = await client.from("orders").insert(payload);
      if (error) throw error;

      setSuccessMessage("¡Listo, chamo! Tu solicitud fue recibida.");
      setFormState((current) => ({
        ...initialForm,
        name: current.name,
        phone: current.phone,
      }));
    } catch (error) {
      setErrorMessage(
        `No se pudo enviar la solicitud: ${error instanceof Error ? error.message : "Error inesperado."}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const requestTitle = requestOptions[requestType].title;

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffdfb] px-4">
        <p className="text-sm font-semibold text-slate-600">Preparando tu solicitud…</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffdfb] px-4">
        <section className="max-w-md rounded-[28px] border border-rose-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-black text-[#0B347A]">Pedidos no disponibles</h1>
          <p role="alert" className="mt-3 text-sm text-rose-700">{errorMessage}</p>
          <Link href="/" className="mt-5 inline-flex rounded-full bg-[#0B347A] px-5 py-3 font-bold text-white">Volver al inicio</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffdfb] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/brand/logo-mascota.svg" alt="ChamoEntregas" width={52} height={52} className="h-13 w-13 rounded-xl" />
            <span className="font-black text-[#0B347A]">ChamoEntregas</span>
          </Link>
          <Link href="/perfil" className="text-sm font-bold text-[#0B347A]">Mi cuenta</Link>
        </header>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#0B347A] p-6 text-white sm:p-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <div className="mt-5 flex items-center gap-3">
              <Bike className="h-8 w-8 text-[#FF5A0A]" />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">Solicitud rápida</p>
                <h1 className="mt-1 text-3xl font-black">Pide tu entrega en segundos</h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm text-blue-100">
              Completa los datos de recogida y destino. El pago se realiza en efectivo al recibir.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-8">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de servicio</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.keys(requestOptions) as RequestType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRequestType(type)}
                    className={`rounded-2xl border px-3 py-3 text-left text-sm font-bold transition ${
                      requestType === type
                        ? "border-[#0B347A] bg-[#0B347A] text-white shadow-lg shadow-blue-100"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {requestOptions[type].title}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre del perfil</span>
                <input value={formState.name} readOnly required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none" />
                <Link href="/perfil" className="mt-1 inline-block text-xs font-semibold text-[#0B347A]">Editar datos del perfil</Link>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Teléfono para este pedido (opcional)</span>
                <input value={formState.phone} onChange={(event) => changeField("phone", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#0B347A]" placeholder="Puedes dejarlo vacío" />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Ciudad</span>
                <select value={formState.city} onChange={(event) => changeField("city", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <option>Coloncito</option><option>La Fría</option><option>Colón</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Dirección de destino</span>
                <input value={formState.address} onChange={(event) => changeField("address", event.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#0B347A]" placeholder="Calle, sector y punto de referencia" />
              </label>
            </div>

            {requestType === "comida" ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Restaurante (recogida)</span>
                  <input value={formState.restaurant} onChange={(event) => changeField("restaurant", event.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#0B347A]" placeholder="Nombre del restaurante" />
                </label>
                <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Verifica que el restaurante esté abierto antes de enviar el pedido.
                </p>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">¿Qué vas a pedir?</span>
                  <textarea value={formState.item} onChange={(event) => changeField("item", event.target.value)} required rows={3} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#0B347A]" placeholder="Describe los productos" />
                </label>
              </>
            ) : null}

            {requestType === "paquete" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">¿Qué vas a enviar?</span>
                    <input value={formState.packageName} onChange={(event) => changeField("packageName", event.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#0B347A]" placeholder="Caja, sobre, mochila…" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Tamaño</span>
                    <select value={formState.packageSize} onChange={(event) => changeField("packageSize", event.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <option value="">Selecciona</option><option value="pequeño">Pequeño</option><option value="mediano">Mediano</option><option value="grande">Grande</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Foto del paquete (opcional)</span>
                  <input type="file" accept="image/*" onChange={(event) => changeField("photoName", event.target.files?.[0]?.name ?? "")} className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3" />
                  <span className="mt-1 block text-xs text-slate-500">Por ahora guardamos el nombre del archivo como referencia; la imagen no se sube.</span>
                </label>
              </>
            ) : null}

            {requestType === "mandado" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">¿Qué necesitas?</span>
                <textarea value={formState.item} onChange={(event) => changeField("item", event.target.value)} required rows={3} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#0B347A]" placeholder="Describe el mandado" />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Notas adicionales (opcional)</span>
              <textarea value={formState.notes} onChange={(event) => changeField("notes", event.target.value)} rows={3} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#0B347A]" placeholder="Punto de referencia u otra indicación" />
            </label>

            {errorMessage ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
            {successMessage ? <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">{successMessage}</p> : null}
            {isOrderBlocked ? <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Tu cuenta tiene pausadas temporalmente las solicitudes. Contacta a soporte.</p> : null}

            <button
              type="submit"
              disabled={isSubmitting || isOrderBlocked || !user}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FF5A0A] px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-[#e75408] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Enviando…" : `Solicitar ${requestTitle}`}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
