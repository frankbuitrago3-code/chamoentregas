const allowedDestinations = new Set(["/pedido", "/perfil", "/repartidor", "/admin"]);

export function getSafeAuthDestination(value: string | null, fallback = "/perfil") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const destination = new URL(value, "https://chamoentregas.invalid");
    if (
      destination.origin !== "https://chamoentregas.invalid" ||
      !allowedDestinations.has(destination.pathname)
    ) {
      return fallback;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}
