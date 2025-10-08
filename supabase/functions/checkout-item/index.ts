// checkout-item edge function
// Authenticated team user reserves item(s) - supports both single and bulk checkout

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
    if (!jwt) return new Response(JSON.stringify({ error: "Missing Authorization" }), { status: 401, headers: corsHeaders });

    const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt);
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    // Get profile id for the user
    const { data: prof, error: profErr } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (profErr || !prof) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 400, headers: corsHeaders });

    const body = await req.json();
    
    // Support both single item (legacy) and bulk checkout
    const items = body.items || [{ part_id: Number(body.part_id), quantity: 1 }];
    
    console.log('Processing checkout for items:', items);

    // Process each item
    for (const item of items) {
      const part_id = Number(item.part_id);
      const quantity = Number(item.quantity) || 1;
      
      if (!part_id || quantity <= 0) {
        return new Response(
          JSON.stringify({ error: `Invalid part_id or quantity` }), 
          { status: 400, headers: corsHeaders }
        );
      }

      // Use a transaction to safely decrement stock and create tracking records
      // This prevents race conditions from multiple concurrent checkouts
      console.log(`Processing checkout: ${quantity}x Part ID ${part_id}`);

      // Process each unit atomically
      for (let i = 0; i < quantity; i++) {
        const { error: updateErr } = await adminClient.rpc("transaction_decrement_and_track", {
          p_part_id: part_id,
          p_team_profile_id: prof.id,
        });

        if (updateErr) {
          console.error('Checkout error:', updateErr);
          // Check if it's a stock issue
          if (updateErr.message?.includes('quantity') || updateErr.code === '23514') {
            const { data: partInfo } = await adminClient
              .from("parts")
              .select("name, quantity")
              .eq("id", part_id)
              .maybeSingle();
            
            return new Response(
              JSON.stringify({ 
                error: `Insufficient stock${partInfo?.name ? ` for ${partInfo.name}` : ''}. Please refresh and try again.` 
              }), 
              { status: 400, headers: corsHeaders }
            );
          }
          
          return new Response(
            JSON.stringify({ error: `Checkout failed: ${updateErr.message}` }), 
            { status: 500, headers: corsHeaders }
          );
        }
      }
    }

    const totalItems = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0);
    console.log('All items checked out successfully. Total:', totalItems);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Items checked out successfully',
        items_count: totalItems
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e:any) {
    console.error('Error in checkout-item:', e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve(serve);