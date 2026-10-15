"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type AccountMode = "login" | "register";

export function CustomerAccount() {
  const client = getSupabaseClient();
  const router = useRouter();
  const [mode, setMode] = useState<AccountMode>("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!client) return;

    let isMounted = true;
    client.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) setErrorMessage(error.message);
      if (data.session) router.replace("/perfil");
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (isMounted && session) router.replace("/perfil");
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [client, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!client) {
      setErrorMessage("El registro todavía no está disponible. Intenta más tarde.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "register") {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/update-password`,
          },
        });
        if (error) throw error;

        if (data.session) {
          router.replace("/perfil");
        } else {
          setMessage(
            "Revisa tu correo y confirma la cuenta. Después podrás entrar y pedir entregas. El teléfono es opcional y puedes añadirlo a tu perfil.",
          );
        }
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.replace("/perfil");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo completar el acceso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-4 py-10">
      <section className="w-full max-w-lg overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(11,52,122,0.12)]">
        <div className="bg-[#0B347A] px-6 py-6 text-white sm:px-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/brand/logo-mascota.svg"
              alt="ChamoEntregas"
              width={56}
              height={56}
              className="h-14 w-14 rounded-2xl"
            />
            <span className="text-xl font-black">ChamoEntregas</span>
          </Link>
          <h1 className="mt-6 text-3xl font-black">
            {mode === "register" ? "Crea tu cuenta" : "Qué bueno verte"}
          </h1>
          <p className="mt-2 text-sm text-blue-100">
            Tu correo identifica tus pedidos. El teléfono no es obligatorio.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            {(["register", "login"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setMode(tab);
                  setMessage("");
                  setErrorMessage("");
                }}
                className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  mode === tab ? "bg-white text-[#0B347A] shadow-sm" : "text-slate-600"
                }`}
              >
                {tab === "register" ? "Registrarme" : "Iniciar sesión"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre</span>
                <input
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                  placeholder="Tu nombre"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Correo electrónico</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                placeholder="tu@correo.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</span>
              <input
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                placeholder="Mínimo 8 caracteres"
              />
            </label>

            {errorMessage ? (
              <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}
            {message ? (
              <p role="status" className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#FF5A0A] px-4 py-3.5 font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Un momento…"
                : mode === "register"
                  ? "Crear cuenta"
                  : "Entrar"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            Al registrarte, los pedidos quedarán asociados a tu cuenta. Solo el equipo puede
            confirmar incidencias de pago y revisar tu reputación.
          </p>
          <Link href="/" className="mt-5 block text-center text-sm font-semibold text-[#0B347A]">
            Volver a ChamoEntregas
          </Link>
        </div>
      </section>
    </main>
  );
}
