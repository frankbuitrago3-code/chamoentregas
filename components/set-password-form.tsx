"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function SetPasswordForm() {
  const client = getSupabaseClient();
  const [hasSession, setHasSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(client !== null);
  const [isSaving, setIsSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(
    client ? "" : "La autenticación no está configurada.",
  );
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!client) {
      return;
    }

    let isMounted = true;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setHasSession(Boolean(session));
    });

    client.auth.getSession().then(({ data: sessionData, error }) => {
      if (!isMounted) return;
      setHasSession(Boolean(sessionData.session));
      if (error) setErrorMessage(error.message);
      setIsCheckingSession(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!client || !hasSession) {
      setErrorMessage("La invitación no está activa. Solicita que te envíen una nueva.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSaving(true);
    const { error } = await client.auth.updateUser({ password });

    if (error) {
      setErrorMessage(`No se pudo guardar la contraseña: ${error.message}`);
      setIsSaving(false);
      return;
    }

    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      setErrorMessage(
        `La contraseña se guardó, pero no se pudo cerrar la sesión: ${signOutError.message}`,
      );
      setIsSaving(false);
      return;
    }

    setIsComplete(true);
    setIsSaving(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf4] px-4 py-12">
      <section className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(11,52,122,0.12)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF5A0A]">
          ChamoEntregas
        </p>
        <h1 className="mt-2 text-2xl font-black text-[#0B347A]">
          {isComplete ? "Contraseña lista" : "Crea tu contraseña"}
        </h1>

        {isCheckingSession ? (
          <p className="mt-4 text-sm text-slate-600">Verificando la invitación…</p>
        ) : isComplete ? (
          <>
            <p className="mt-4 text-sm text-slate-600">
              Tu contraseña quedó guardada. Ya puedes entrar al panel administrativo.
            </p>
            <Link
              href="/admin"
              className="mt-6 block rounded-2xl bg-[#FF5A0A] px-4 py-3 text-center font-semibold text-white transition hover:brightness-105"
            >
              Ir al panel
            </Link>
          </>
        ) : !hasSession ? (
          <>
            <p className="mt-4 text-sm text-slate-600">
              No encontramos una invitación activa en este navegador. Abre el enlace más
              reciente que recibiste por correo.
            </p>
            {errorMessage ? (
              <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-slate-600">
              Elige una contraseña para tu cuenta. No la compartas con nadie.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Nueva contraseña
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Confirmar contraseña
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#0B347A] focus:ring-2 focus:ring-[#0B347A]/15"
                />
              </label>
              {errorMessage ? (
                <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-2xl bg-[#FF5A0A] px-4 py-3 font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
