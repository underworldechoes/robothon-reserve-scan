// admin-delete-user edge function
// Requires caller to be an authenticated admin. Deletes both auth user and profile.

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

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Missing Authorization" }), { 
      status: 401,
      headers: corsHeaders 
    });

    // Validate caller user from JWT
    const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Check admin role via profiles (bypass RLS with service role)
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { 
        status: 403,
        headers: corsHeaders 
      });
    }

    const body = await req.json();
    const userId = String(body.userId || "").trim();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Get the profile to check if user is admin
    const { data: targetProfile, error: targetProfileErr } = await adminClient
      .from("profiles")
      .select("role, username")
      .eq("user_id", userId)
      .maybeSingle();

    if (targetProfileErr) {
      throw targetProfileErr;
    }

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: "User not found" }), { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Prevent deletion of admin users
    if (targetProfile.role === "admin") {
      return new Response(JSON.stringify({ error: "Cannot delete admin users" }), { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Delete the auth user (this will cascade to profile due to foreign key)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      throw deleteError;
    }

    console.log(`User ${targetProfile.username} (${userId}) deleted by admin ${userData.user.email}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `User ${targetProfile.username} deleted successfully` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Error deleting user:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve(serve);
