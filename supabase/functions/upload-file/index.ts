import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple bcrypt-like hash using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keyword, password, fileName, fileSize, fileData } = await req.json();

    // Validation
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
    if (!fileData || !fileName) {
      return new Response(JSON.stringify({ error: "Dosya gereklidir." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (fileSize > 100 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Dosya boyutu 100MB'dan büyük olamaz." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check keyword uniqueness
    const { data: existing } = await supabase
      .from("files")
      .select("id")
      .eq("keyword", keyword)
      .eq("is_downloaded", false)
      .lt("expires_at", new Date().toISOString())
      .not("expires_at", "lt", new Date().toISOString());

    // Better check: keyword must not exist among active (not downloaded, not expired) files
    const { data: activeFiles } = await supabase
      .from("files")
      .select("id")
      .eq("keyword", keyword)
      .eq("is_downloaded", false)
      .gte("expires_at", new Date().toISOString());

    if (activeFiles && activeFiles.length > 0) {
      return new Response(JSON.stringify({ error: "Bu anahtar kelime zaten kullanılıyor. Farklı bir kelime deneyin." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64 file data
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to storage
    const filePath = `${crypto.randomUUID()}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(filePath, bytes, { contentType: "application/octet-stream" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Dosya yüklenirken bir hata oluştu." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert record
    const { error: dbError } = await supabase.from("files").insert({
      keyword,
      password_hash: passwordHash,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
    });

    if (dbError) {
      console.error("DB error:", dbError);
      // Clean up uploaded file
      await supabase.storage.from("files").remove([filePath]);
      return new Response(JSON.stringify({ error: "Kayıt oluşturulurken bir hata oluştu." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Sunucu hatası." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
