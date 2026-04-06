import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [saltHex, hashHex] = hash.split(":");
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const derivedHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, "0")).join("");
  return derivedHex === hashHex;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { keyword, password } = await req.json();

    // Veritabanında keyword'ü ara
    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .select("*")
      .eq("keyword", keyword)
      .eq("is_downloaded", false)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (dbError || !fileRecord) {
      return new Response(
        JSON.stringify({ error: "Kelime veya şifre hatalı." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Şifreyi doğrula
    const passwordValid = await verifyPassword(password, fileRecord.password_hash);
    if (!passwordValid) {
      return new Response(
        JSON.stringify({ error: "Kelime veya şifre hatalı." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dosyayı storage'dan indir
    const { data, error: downloadError } = await supabase.storage
      .from("files")
      .download(fileRecord.file_path);

    if (downloadError || !data) {
      return new Response(
        JSON.stringify({ error: "Dosya bulunamadı." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const buffer = await data.arrayBuffer();

    return new Response(buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileRecord.file_name}"`,
      },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Sunucu hatası." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
