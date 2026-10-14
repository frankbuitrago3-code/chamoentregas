"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clock3,
  MapPinned,
  MessageCircle,
  Package,
  Utensils,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { requestOptions, type RequestType } from "@/lib/demo-data";
import { PwaInstallButton } from "@/components/pwa-install-button";

const services = [
  {
    key: "comida" as const,
    icon: Utensils,
    title: "Pedir comida",
    description: "Desde restaurantes locales hasta tu puerta en minutos.",
  },
  {
    key: "paquete" as const,
    icon: Package,
    title: "Enviar paquetes",
    description: "Documentos y paquetes pequeños con entrega segura y rápida.",
  },
  {
    key: "mandado" as const,
    icon: BriefcaseBusiness,
    title: "Hacer mandados",
    description: "Trae lo que necesitas desde comercios cercanos.",
  },
];

const steps = [
  "Solicita",
  "Un repartidor acepta",
  "Recibe y paga en efectivo",
];

const faq = [
  {
    question: "¿Cómo pago?",
    answer: "Pago en efectivo al recibir. El repartidor confirma el monto con el cliente.",
  },
  {
    question: "¿Qué hago si el restaurante está cerrado?",
    answer: "Debes verificar que el restaurante esté abierto antes de enviar la solicitud; si no lo está, puedes cancelar y volver a intentarlo más tarde.",
  },
  {
    question: "¿Puedo enviar un paquete?",
    answer: "Sí, puedes enviar paquetes pequeños y documentos dentro de nuestra zona de cobertura.",
  },
  {
    question: "¿Cómo contacto al repartidor?",
    answer: "El repartidor se comunica contigo por teléfono una vez acepta la solicitud y va en camino.",
  },
];

export function ChamoLandingPage() {
  const [requestType, setRequestType] = useState<RequestType>("comida");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState({
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
  });

  const requestTitle = useMemo(
    () => requestOptions[requestType].title,
    [requestType],
  );

  function changeField(field: keyof typeof formState, value: string) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    const payload = {
      id: crypto.randomUUID(),
      customer_name: formState.name,
      customer_phone: formState.phone,
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
      created_at: new Date().toISOString(),
    };

    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error(
          "Las solicitudes todavía no están habilitadas. Intenta más tarde o contáctanos por WhatsApp.",
        );
      }

      const { error } = await client.from("orders").insert(payload);
      if (error) throw error;

      setSuccessMessage("¡Listo, chamo! Tu solicitud fue recibida.");
      setFormState({
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar la solicitud.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const whatsAppNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "584165552233";

  return (
    <div className="bg-[#fffdfb] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="#inicio" className="flex items-center gap-3">
            <Image src="/brand/logo-mascota.svg" alt="ChamoEntregas" width={76} height={76} className="h-[76px] w-[76px] rounded-2xl object-cover" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Local</div>
              <div className="text-lg font-black text-[#0B347A]">ChamoEntregas</div>
            </div>
          </a>

          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex">
            <a href="#inicio" className="transition hover:text-[#0B347A]">Inicio</a>
            <a href="#como-funciona" className="transition hover:text-[#0B347A]">Cómo funciona</a>
            <a href="#servicios" className="transition hover:text-[#0B347A]">Servicios</a>
          </div>

          <a
            href="#solicitud-rapida"
            className="rounded-full bg-[#0B347A] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:translate-y-[-1px] hover:bg-[#0a2e6d]"
          >
            Pedir ahora
          </a>
        </nav>
      </header>

      <main id="inicio">
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#FF5A0A]">
              <Clock3 className="h-3.5 w-3.5" />
              Servicio local en Coloncito
            </div>

            <h1 className="max-w-xl text-4xl font-black leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Tu chamo de confianza para entregar lo que necesites.
            </h1>

            <p className="mt-5 max-w-lg text-lg text-slate-600">
              Comida, paquetes y mandados en Coloncito.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#solicitud-rapida"
                className="inline-flex items-center justify-center rounded-full bg-[#FF5A0A] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:translate-y-[-1px] hover:bg-[#e75408]"
              >
                Solicitar una entrega
              </a>
              <a
                href="#servicios"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-base font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Ver servicios
              </a>
              <PwaInstallButton />
            </div>

            <div className="mt-8 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              Pago en efectivo al recibir.
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-8 rounded-[36px] bg-gradient-to-br from-[#0B347A]/8 via-[#FF5A0A]/8 to-[#fff7ed] blur-2xl" />
            <div className="relative w-full max-w-lg rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <div className="rounded-[26px] bg-[#fff7ed] p-4">
                <Image
                  src="/brand/logo-mascota.svg"
                  alt="Mascota ChamoEntregas"
                  width={620}
                  height={620}
                  className="mx-auto w-full max-w-[430px]"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section id="servicios" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#FF5A0A]">Servicios</p>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Entrega para cada momento</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {services.map(({ key, icon: Icon, title, description }) => (
              <article key={key} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B347A] text-white">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">{title}</h3>
                <p className="mt-3 text-base text-slate-600">{description}</p>
                <a
                  href="#solicitud-rapida"
                  onClick={() => setRequestType(key)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FF5A0A] px-4 py-2 text-sm font-bold text-white"
                >
                  Solicitar <ChevronRight className="h-4 w-4" />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="bg-[#f8fafc] py-10 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0B347A]">Cómo funciona</p>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Todo fácil, rápido y claro</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {steps.map((label, index) => (
                <div key={label} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B347A] text-lg font-black text-white">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{label}</h3>
                  <p className="mt-3 text-slate-600">
                    {index === 0 && "Escribe el tipo de entrega y la información de recogida."}
                    {index === 1 && "Un repartidor revisa la solicitud y acepta la entrega."}
                    {index === 2 && "Receives el pedido y pagas en efectivo al recibirlo."}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
              Aclaración: el cliente debe verificar que el restaurante esté abierto antes de confirmar la solicitud.
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex items-center justify-center">
              <div className="rounded-[28px] bg-[#0B347A] p-6 text-white shadow-xl shadow-blue-200">
                <MapPinned className="mb-4 h-8 w-8 text-[#FF5A0A]" />
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-100">Cobertura</p>
                <h3 className="mt-2 text-3xl font-black">Disponible y creciendo</h3>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xl font-black text-slate-900">Disponible inicialmente en Coloncito, Táchira.</p>
              </div>
              <div className="rounded-[24px] border border-dashed border-[#FF5A0A]/40 bg-[#fff8f2] p-5">
                <p className="text-xl font-black text-slate-900">Próximamente: La Fría y Colón.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#fffaf4] py-10 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FF5A0A]">Contacto</p>
                <h2 className="mt-3 text-3xl font-black text-slate-900">Estamos listos para ayudarte</h2>
                <p className="mt-3 text-slate-600">Si tienes dudas, consulta por entregas o quieres coordinar una zona, escríbenos por WhatsApp.</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={`https://wa.me/${whatsAppNumber}?text=Hola%20ChamoEntregas%2C%20quiero%20hacer%20una%20consulta`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 font-bold text-white shadow-lg shadow-emerald-200"
                  >
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp
                  </a>
                  <a
                    href="#solicitud-rapida"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700"
                  >
                    Solicitar ahora
                  </a>
                </div>

                <div className="mt-8 rounded-[24px] bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-500">Redes sociales</div>
                  <div className="mt-3 flex items-center gap-3 text-slate-700">
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold border border-slate-200">Instagram</span>
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold border border-slate-200">Facebook</span>
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold border border-slate-200">TikTok</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0B347A]">Preguntas frecuentes</p>
                <div className="mt-4 space-y-4">
                  {faq.map((item) => (
                    <div key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="font-black text-slate-900">{item.question}</h3>
                      <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="solicitud-rapida" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-center rounded-[28px] bg-[#0B347A] p-6 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-100">Solicitud rápida</p>
              <h2 className="mt-3 text-3xl font-black">Pide tu entrega en segundos</h2>
              <p className="mt-3 text-blue-100">
                Elige el servicio, completa la información y nuestro equipo lo revisará de inmediato.
              </p>
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                <Bike className="h-6 w-6 text-[#FF5A0A]" />
                <span className="font-semibold">Atención local en Coloncito</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-1">
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
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre</span>
                  <input
                    value={formState.name}
                    onChange={(event) => changeField("name", event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                    placeholder="Tu nombre"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Teléfono</span>
                  <input
                    value={formState.phone}
                    onChange={(event) => changeField("phone", event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                    placeholder="0414-1234567"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Ciudad</span>
                  <select
                    value={formState.city}
                    onChange={(event) => changeField("city", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                  >
                    <option>Coloncito</option>
                    <option>La Fría</option>
                    <option>Colón</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Dirección</span>
                  <input
                    value={formState.address}
                    onChange={(event) => changeField("address", event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                    placeholder="Calle principal"
                  />
                </label>
              </div>

              {requestType === "comida" ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Restaurante</span>
                    <input
                      value={formState.restaurant}
                      onChange={(event) => changeField("restaurant", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                      placeholder="Nombre del restaurante"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Pedido</span>
                    <textarea
                      value={formState.item}
                      onChange={(event) => changeField("item", event.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                      placeholder="Ej: 2 arepas rellenas y una hamburguesa"
                    />
                  </label>
                </>
              ) : null}

              {requestType === "paquete" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre del paquete</span>
                      <input
                        value={formState.packageName}
                        onChange={(event) => changeField("packageName", event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                        placeholder="Caja, sobre, mochila"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Tamaño</span>
                      <select
                        value={formState.packageSize}
                        onChange={(event) => changeField("packageSize", event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                      >
                        <option value="">Selecciona</option>
                        <option value="pequeño">Pequeño</option>
                        <option value="mediano">Mediano</option>
                        <option value="grande">Grande</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Foto opcional</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => changeField("photoName", event.target.files?.[0]?.name ?? "")}
                      className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                    />
                  </label>
                </>
              ) : null}

              {requestType === "mandado" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Qué necesitas</span>
                  <textarea
                    value={formState.item}
                    onChange={(event) => changeField("item", event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                    placeholder="Ej: 1 litro de leche y un paquete de café"
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Notas</span>
                <textarea
                  value={formState.notes}
                  onChange={(event) => changeField("notes", event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                  placeholder="Detalle adicional"
                />
              </label>

              {errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FF5A0A] px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:translate-y-[-1px] hover:bg-[#e75408] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Enviando..." : `Solicitar ${requestTitle}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
          <p>ChamoEntregas · Coloncito, Táchira</p>
          <a
            href="/repartidor"
            className="font-semibold text-[#0B347A] transition hover:text-[#FF5A0A]"
          >
            ¿Eres repartidor? Inicia sesión
          </a>
        </div>
      </footer>
    </div>
  );
}
