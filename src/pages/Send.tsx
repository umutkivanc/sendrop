import { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Upload, ArrowLeft, Check, Key, Lock, Clock, AlertTriangle, X, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const Send = () => {
  const [file, setFile] = useState<File | null>(null);
  const [keyword, setKeyword] = useState("");
  const [password, setPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      setError("Dosya boyutu 100MB'dan büyük olamaz.");
      return;
    }
    setFile(f);
    setError("");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError("Lütfen bir dosya seçin.");
    if (keyword.length < 3 || keyword.length > 10) return setError("Anahtar kelime 3-10 karakter olmalıdır.");
    if (password.length < 3 || password.length > 10) return setError("Şifre 3-10 karakter olmalıdır.");

    setUploading(true);
    setError("");
    setProgress(10);

    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      setProgress(40);

      const filePath = `${keyword}/${file.name}`;

      const { data, error } = await supabase.storage
        .from("files") // bucket adı
        .upload(filePath, file);

      if (error) {
        console.error(error);
      } else {
        console.log("Yüklendi:", data);
      }

      setProgress(90);

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || "Yükleme başarısız oldu.");
      }

      setProgress(100);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-[hsl(145,100%,65%)]/20 flex items-center justify-center mx-auto">
                <Check className="h-6 w-6" style={{ color: "hsl(145, 100%, 65%)" }} />
              </div>
              <h2 className="text-xl font-bold">Dosya Başarıyla Yüklendi!</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                <Key className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Anahtar Kelime</p>
                  <p className="font-mono font-bold">{keyword}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                <Lock className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Şifre</p>
                  <p className="font-mono font-bold">{password}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Geçerlilik Süresi</p>
                  <p className="font-bold">3 Gün</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Bu bilgileri kaydedin! Bir daha gösterilmeyecek. Dosya yalnızca 1 kez indirilebilir.
              </p>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/">Ana Sayfaya Dön</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-2xl font-bold">Dosya Gönder</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : file ? "border-primary/50" : "border-border hover:border-muted-foreground"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="space-y-2">
                <File className="h-8 w-8 text-primary mx-auto" />
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <X className="h-4 w-4 mr-1" /> Kaldır
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Dosyayı sürükleyip bırakın veya tıklayın
                </p>
                <p className="text-xs text-muted-foreground">Maks. 100MB</p>
              </div>
            )}
          </div>

          {/* Keyword */}
          <div className="space-y-2">
            <Label htmlFor="keyword">Anahtar Kelime (3-10 karakter)</Label>
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="örn: dosya123"
              minLength={3}
              maxLength={10}
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Şifre (3-10 karakter)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              minLength={3}
              maxLength={10}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {uploading && <Progress value={progress} className="h-2" />}

          <Button type="submit" className="w-full gap-2" disabled={uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? "Yükleniyor..." : "Dosyayı Gönder"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Send;
