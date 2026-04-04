import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find expired or downloaded files
    const { data: expiredFiles } = await supabase
      .from("files")
      .select("id, file_path")
      .or(`expires_at.lt.${new Date().toISOString()},is_downloaded.eq.true`);

    if (!expiredFiles || expiredFiles.length === 0) {
      return new Response(JSON.stringify({ message: "Temizlenecek dosya yok.", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete from storage
    const filePaths = expiredFiles.map(f => f.file_path);
    await supabase.storage.from("files").remove(filePaths);

    // Delete from database
    const ids = expiredFiles.map(f => f.id);
    await supabase.from("files").delete().in("id", ids);

    // Clean up old ip_blocks entries
    await supabase.from("ip_blocks").delete().lt("blocked_until", new Date().toISOString());

    return new Response(JSON.stringify({ message: `${expiredFiles.length} dosya temizlendi.`, count: expiredFiles.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(JSON.stringify({ error: "Temizleme hatası." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
