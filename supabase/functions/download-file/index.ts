import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const computedHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  return computedHex === hashHex;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keyword, password } = await req.json();

    if (!keyword || keyword.length < 3 || keyword.length > 10) {
      return new Response(JSON.stringify({ error: "Anahtar kelime 3-10 karakter olmalıdır." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!password || password.length < 3 || password.length > 10) {
      return new Response(JSON.stringify({ error: "Şifre 3-10 karakter olmalıdır." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "unknown";

    // Check IP block
    const { data: block } = await supabase
      .from("ip_blocks")
      .select("*")
      .eq("ip_address", ip)
      .eq("keyword", keyword)
      .single();

    if (block && block.blocked_until) {
      const blockedUntil = new Date(block.blocked_until);
      if (blockedUntil > new Date()) {
        const remaining = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000);
        return new Response(JSON.stringify({
          error: `Çok fazla yanlış deneme. ${remaining} dakika sonra tekrar deneyin.`
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Find file
    const { data: fileRecord } = await supabase
      .from("files")
      .select("*")
      .eq("keyword", keyword)
      .eq("is_downloaded", false)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (!fileRecord) {
      return new Response(JSON.stringify({ error: "Dosya bulunamadı veya süresi dolmuş." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, fileRecord.password_hash);

    if (!isValid) {
      // Increment attempt count
      const currentAttempts = (block?.attempt_count || 0) + 1;

      // Calculate block duration: 15min * 2^(floor((attempts-3)/1)) for attempts >= 3
      let blockedUntil: string | null = null;
      if (currentAttempts >= 3) {
        const multiplier = Math.pow(2, currentAttempts - 3);
        const blockMinutes = 15 * multiplier;
        blockedUntil = new Date(Date.now() + blockMinutes * 60000).toISOString();
      }

      if (block) {
        await supabase
          .from("ip_blocks")
          .update({ attempt_count: currentAttempts, blocked_until: blockedUntil })
          .eq("id", block.id);
      } else {
        await supabase
          .from("ip_blocks")
          .insert({ ip_address: ip, keyword, attempt_count: currentAttempts, blocked_until: blockedUntil });
      }

      const remainingAttempts = Math.max(0, 3 - currentAttempts);
      const msg = currentAttempts >= 3
        ? `Yanlış şifre. ${Math.ceil(15 * Math.pow(2, currentAttempts - 3))} dakika beklemeniz gerekiyor.`
        : `Yanlış şifre. ${remainingAttempts} deneme hakkınız kaldı.`;

      return new Response(JSON.stringify({ error: msg }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Password correct - reset IP block
    if (block) {
      await supabase.from("ip_blocks").delete().eq("id", block.id);
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("files")
      .download(fileRecord.file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Dosya indirilemedi." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Mark as downloaded
    await supabase.from("files").update({ is_downloaded: true }).eq("id", fileRecord.id);

    // Delete from storage
    await supabase.storage.from("files").remove([fileRecord.file_path]);

    return new Response(JSON.stringify({
      fileData: base64,
      fileName: fileRecord.file_name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Sunucu hatası." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
