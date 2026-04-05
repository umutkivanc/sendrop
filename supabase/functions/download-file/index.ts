import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { keyword, password } = await req.json();

    // → Burada filePath’i keyword’dan üret
    const filePath = keyword;

    const { data, error } = await supabase.storage
      .from("files")
      .download(filePath);

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: error?.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const buffer = await data.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filePath}"`,
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as any).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
