"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

function subscribeToInstalledMode(onChange: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);

  return () => {
    displayMode.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

function isRunningAsInstalledApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const isInstalled = useSyncExternalStore(
    subscribeToInstalledMode,
    isRunningAsInstalledApp,
    () => false,
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [device, setDevice] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error: unknown) => {
          console.error("No se pudo registrar el service worker de ChamoEntregas:", error);
        });
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      const userAgent = navigator.userAgent;
      setDevice(
        /iPad|iPhone|iPod/.test(userAgent)
          ? "ios"
          : /Android/i.test(userAgent)
            ? "android"
            : "other",
      );
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  if (isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void installApp()}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0B347A]/20 bg-white px-5 py-3.5 text-base font-bold text-[#0B347A] transition hover:border-[#0B347A] hover:bg-blue-50"
      >
        <Download className="h-4 w-4" />
        Instalar app
      </button>

      {showInstructions ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowInstructions(false);
            }
          }}
        >
          <section
            aria-labelledby="install-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#FF5A0A]">
                  ChamoEntregas
                </p>
                <h2 id="install-title" className="mt-2 text-2xl font-black text-slate-900">
                  Añádela a tu teléfono
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                aria-label="Cerrar instrucciones"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {device === "ios" ? (
              <p className="mt-4 text-slate-600">
                En Safari, toca <strong>Compartir</strong> y luego{" "}
                <strong>Añadir a pantalla de inicio</strong>.
              </p>
            ) : device === "android" ? (
              <p className="mt-4 text-slate-600">
                En Chrome, abre el menú <strong>⋮</strong> y toca{" "}
                <strong>Instalar aplicación</strong> o{" "}
                <strong>Añadir a pantalla de inicio</strong>.
              </p>
            ) : (
              <p className="mt-4 text-slate-600">
                Abre esta página desde el navegador de tu teléfono. En el menú
                del navegador selecciona <strong>Instalar aplicación</strong> o{" "}
                <strong>Añadir a pantalla de inicio</strong>.
              </p>
            )}

            <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
              Para instalarla, la página debe estar publicada con HTTPS. La
              dirección local de prueba no permite instalarla en el teléfono.
            </p>

            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full rounded-full bg-[#0B347A] px-4 py-3 font-bold text-white"
            >
              Entendido
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
