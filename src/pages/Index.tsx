import { Link } from "react-router-dom";
import { Upload, Download, Shield, Clock, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-lg w-full space-y-8">
        {/* Logo */}
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">
            Sen<span className="text-primary">drop</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Anonim ve güvenli dosya transferi. Kayıt gerektirmez.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <Shield className="h-6 w-6 text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">Şifre korumalı</p>
          </div>
          <div className="space-y-2">
            <Clock className="h-6 w-6 text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">3 gün geçerli</p>
          </div>
          <div className="space-y-2">
            <Key className="h-6 w-6 text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">Tek kullanımlık</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="gap-2 text-base px-8">
            <Link to="/send">
              <Upload className="h-5 w-5" />
              Dosya Gönder
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 text-base px-8">
            <Link to="/receive">
              <Download className="h-5 w-5" />
              Dosya Al
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground pt-4">
          Maksimum 100MB • Her dosya türü desteklenir
        </p>
      </div>
    </div>
  );
};

export default Index;
