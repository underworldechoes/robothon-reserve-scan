// bootstrap-admin edge function
// Creates a default admin user if none exists

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export async function serve(req: Request): Promise<Response> {
  try {
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check if any admin profile exists
    const { data: admins, error: adminsError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (adminsError) throw adminsError;

    if (admins && admins.length > 0) {
      return new Response(JSON.stringify({ created: false, message: "Admin already exists" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create the admin auth user
    const email = "admin@robothon.local";
    const password = "admin123";

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) throw createError || new Error("Failed to create admin user");

    // Insert profile
    const { error: profileErr } = await adminClient.from("profiles").insert({
      user_id: created.user.id,
      username: "admin",
      role: "admin",
    });

    if (profileErr) throw profileErr;

    return new Response(JSON.stringify({ created: true, email, password }), {
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
