import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type CourierInput = {
  name?: unknown;
  email?: unknown;
  city?: unknown;
  phone?: unknown;
};

type AdminContext =
  | { response: NextResponse }
  | { admin: SupabaseClient };

async function getAdminContext(request: NextRequest): Promise<AdminContext> {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return {
      response: NextResponse.json(
        { error: "La conexión con Supabase no está configurada en el servidor." },
        { status: 503 },
      ),
    };
  }
  if (!accessToken) {
    return {
      response: NextResponse.json({ error: "Inicia sesión como administrador." }, { status: 401 }),
    };
  }

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return {
      response: NextResponse.json({ error: "La sesión no es válida o ya venció." }, { status: 401 }),
    };
  }
  if (data.user.app_metadata.role !== "admin") {
    return {
      response: NextResponse.json({ error: "Solo un administrador puede gestionar repartidores." }, { status: 403 }),
    };
  }
  if (!serviceKey) {
    return {
      response: NextResponse.json(
        { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY como secreto del servidor." },
        { status: 503 },
      ),
    };
  }

  return {
    admin: createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext(request);
  if ("response" in context) return context.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "El cuerpo de la solicitud debe ser un objeto." }, { status: 400 });
  }
  const input = body as CourierInput;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const city = typeof input.city === "string" ? input.city.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const supportedCities = new Set(["Coloncito", "La Fría", "Colón"]);

  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Escribe un nombre de 2 a 100 caracteres." }, { status: 400 });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Escribe un correo electrónico válido." }, { status: 400 });
  }
  if (!supportedCities.has(city) || phone.length > 40) {
    return NextResponse.json({ error: "Revisa la ciudad y el teléfono del repartidor." }, { status: 400 });
  }

  const { data: existingCourier, error: lookupError } = await context.admin
    .from("couriers")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (lookupError) {
    console.error("No se pudo comprobar si el repartidor ya existe:", lookupError);
    return NextResponse.json(
      { error: "No se pudo comprobar el correo. Confirma que aplicaste la migración de repartidores." },
      { status: 500 },
    );
  }
  if (existingCourier) {
    return NextResponse.json({ error: "Ya existe un perfil de repartidor con ese correo." }, { status: 409 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chamoentregas.vercel.app";
  const { data: invitation, error: invitationError } =
    await context.admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo: `${siteUrl}/auth/update-password?next=${encodeURIComponent("/repartidor")}`,
    });

  if (invitationError || !invitation.user) {
    const isExistingAccount = invitationError?.code === "email_exists";
    return NextResponse.json(
      {
        error: isExistingAccount
          ? "Ese correo ya tiene una cuenta. Usa un correo nuevo para invitar al repartidor."
          : `Supabase no pudo enviar la invitación${invitationError ? `: ${invitationError.message}` : "."}`,
      },
      { status: isExistingAccount ? 409 : 502 },
    );
  }

  const { error: roleError } = await context.admin.auth.admin.updateUserById(
    invitation.user.id,
    { app_metadata: { ...invitation.user.app_metadata, role: "courier" } },
  );
  if (roleError) {
    const { error: deleteError } = await context.admin.auth.admin.deleteUser(invitation.user.id);
    console.error("No se pudo asignar el rol al repartidor invitado:", roleError);
    if (deleteError) console.error("No se pudo retirar la cuenta sin rol:", deleteError);
    return NextResponse.json(
      { error: "La invitación no se completó porque no se pudo asignar el rol de repartidor." },
      { status: 500 },
    );
  }

  const { data: courier, error: courierError } = await context.admin
    .from("couriers")
    .insert({
      name,
      email,
      city,
      phone: phone || null,
      active: true,
      auth_user_id: invitation.user.id,
    })
    .select("id,name,email,city,phone,active,auth_user_id")
    .single();

  if (courierError) {
    const { error: deleteError } = await context.admin.auth.admin.deleteUser(invitation.user.id);
    console.error("No se pudo crear el perfil del repartidor:", courierError);
    if (deleteError) console.error("No se pudo retirar la cuenta sin perfil:", deleteError);
    return NextResponse.json(
      { error: "La invitación no se completó porque no se pudo crear el perfil del repartidor." },
      { status: 500 },
    );
  }

  return NextResponse.json({ courier, message: "Invitación enviada por correo." }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminContext(request);
  if ("response" in context) return context.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "El cuerpo de la solicitud debe ser un objeto." }, { status: 400 });
  }
  const input = body as { id?: unknown; active?: unknown };

  if (typeof input.id !== "string" || typeof input.active !== "boolean") {
    return NextResponse.json({ error: "Selecciona un repartidor y un estado válido." }, { status: 400 });
  }

  const { data, error } = await context.admin
    .from("couriers")
    .update({ active: input.active })
    .eq("id", input.id)
    .select("id,name,email,city,phone,active,auth_user_id")
    .maybeSingle();

  if (error) {
    console.error("No se pudo cambiar el acceso del repartidor:", error);
    return NextResponse.json({ error: "No se pudo actualizar el acceso del repartidor." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "No se encontró ese repartidor." }, { status: 404 });

  return NextResponse.json({ courier: data });
}
