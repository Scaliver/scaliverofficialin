import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = "https://aluu.in/api/v.1";

async function aluuFetch(path: string, init: RequestInit = {}) {
  const apiKey = Deno.env.get("ALUU_API_KEY");
  if (!apiKey) throw new Error("ALUU_API_KEY not configured");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "games") {
      const { json } = await aluuFetch(`/games`);
      return new Response(JSON.stringify(json), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "products") {
      const { gameCode } = body;
      if (!gameCode) throw new Error("gameCode required");
      const { json } = await aluuFetch(`/products/${encodeURIComponent(gameCode)}`);
      return new Response(JSON.stringify(json), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "server_options") {
      const { gameCode } = body;
      if (!gameCode) throw new Error("gameCode required");
      const { json } = await aluuFetch(`/server-options?gamecode=${encodeURIComponent(gameCode)}`);
      return new Response(JSON.stringify(json), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_order") {
      const { game, denom, userid, serverid, charname, partner_orderid, partner_webhook_url } = body;
      if (!game || !denom || !userid || !partner_orderid) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const payload: Record<string, unknown> = {
        game, denom, userid, partner_orderid,
      };
      if (serverid) payload.serverid = serverid;
      if (charname) payload.charname = charname;
      if (partner_webhook_url) payload.partner_webhook_url = partner_webhook_url;

      const { status, json } = await aluuFetch(`/create`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Normalize Aluu response. Aluu may return { status: "success"/"pending"/..., data: {...} }
      // or { error: "..." } / { message: "..." }. Treat HTTP 2xx + no explicit error as success.
      const aluuStatus = (json?.status ?? "").toString().toLowerCase();
      const explicitOk = aluuStatus === "success" || aluuStatus === "pending" || aluuStatus === "processing" || json?.success === true;
      const explicitFail = !!(json?.error) || aluuStatus === "failed" || aluuStatus === "error" || json?.success === false;
      const ok = status >= 200 && status < 300 && !explicitFail && (explicitOk || (!aluuStatus && !json?.message));
      const envelope = {
        success: ok,
        error: ok ? undefined : (json?.error || json?.message || `Aluu HTTP ${status}`),
        data: json?.data ?? json,
        raw: json,
      };
      return new Response(JSON.stringify(envelope), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get_order") {
      const { partner_orderid } = body;
      if (!partner_orderid) throw new Error("partner_orderid required");
      const { json } = await aluuFetch(`/${encodeURIComponent(partner_orderid)}`);
      return new Response(JSON.stringify(json), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "track_order") {
      const { partner_orderid } = body;
      if (!partner_orderid) throw new Error("partner_orderid required");
      const { json } = await aluuFetch(`/${encodeURIComponent(partner_orderid)}/track`, { method: "POST" });
      return new Response(JSON.stringify(json), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "name_check") {
      const { gameCode, userId, serverId, charname } = body;
      if (!gameCode || !userId) {
        return new Response(JSON.stringify({ success: false, error: "gameCode and userId required" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const apiKey = Deno.env.get("ALUU_API_KEY");
      if (!apiKey) throw new Error("ALUU_API_KEY not configured");
      const qs = new URLSearchParams({ user_id: String(userId) });
      if (serverId) qs.set("server_id", String(serverId));
      if (charname) qs.set("charname", String(charname));
      const url = `https://aluu.in/api/check/${encodeURIComponent(gameCode)}-check?${qs.toString()}`;
      const res = await fetch(url, { headers: { "x-api-key": apiKey } });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      const username = json?.username || json?.data?.username || json?.nickname || json?.data?.nickname || "";
      const region = json?.country || json?.region || json?.data?.country || json?.data?.region || "";
      const ok = json?.success === true && !!username;
      return new Response(JSON.stringify({
        success: ok,
        username: ok ? username : undefined,
        region: ok ? region : undefined,
        error: ok ? undefined : (json?.message || json?.error || "Player not found"),
        raw: json,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("aluu-order error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
