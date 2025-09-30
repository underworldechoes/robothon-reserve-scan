// checkout-item edge function
// Authenticated team user reserves an item (decrement part quantity and insert inventory_tracking)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function serve(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Missing Authorization" }), { status: 401 });

    const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt);
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });

    // Get profile id for the user
    const { data: prof, error: profErr } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (profErr || !prof) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 400 });

    const body = await req.json();
    const part_id = Number(body.part_id);
    if (!part_id) return new Response(JSON.stringify({ error: "Invalid part_id" }), { status: 400 });

    // Fetch part
    const { data: part, error: partErr } = await adminClient
      .from("parts")
      .select("id, quantity")
      .eq("id", part_id)
      .maybeSingle();
    if (partErr || !part) return new Response(JSON.stringify({ error: "Part not found" }), { status: 404 });

    if (part.quantity <= 0) return new Response(JSON.stringify({ error: "Out of stock" }), { status: 400 });

    // Decrement quantity and insert tracking in a transaction (using RPC)
    const { error: updateErr } = await adminClient.rpc("transaction_decrement_and_track", {
      p_part_id: part_id,
      p_team_profile_id: prof.id,
    });

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve(serve);
