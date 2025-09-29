// admin-create-user edge function
// Requires caller to be an authenticated admin. Creates an auth user and matching profile.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export async function serve(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Missing Authorization" }), { status: 401 });

    // Validate caller user from JWT
    const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt);
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });

    // Check admin role via profiles (bypass RLS with service role)
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();
    const role = body.role === "admin" ? "admin" : "team";

    if (!username || username.length < 3) {
      return new Response(JSON.stringify({ error: "Username too short" }), { status: 400 });
    }
    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), { status: 400 });
    }

    const email = `${username}@team.local`;

    // Create auth user
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) throw createError || new Error("Failed to create user");

    // Insert profile
    const { error: profileInsertErr } = await adminClient.from("profiles").insert({
      user_id: created.user.id,
      username,
      role,
    });
    if (profileInsertErr) throw profileInsertErr;

    return new Response(JSON.stringify({ email, username, role }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

Deno.serve(serve);
