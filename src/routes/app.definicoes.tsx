import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings, Moon, Sun, User, Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/definicoes")({ component: Definicoes });

const APP_VERSION = "1.0.0";

function Definicoes() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [patrol, setPatrol] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, patrol")
        .eq("id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      setFullName(data?.full_name ?? "");
      setPatrol((data as { patrol?: string | null } | null)?.patrol ?? "");
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, patrol })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Definições guardadas");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl font-bold">Definições</h1>
      </header>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <User className="h-4 w-4 text-primary" /> Perfil
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="O seu nome" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="patrol">Patrulha</Label>
          <Input id="patrol" value={patrol} onChange={(e) => setPatrol(e.target.value)} placeholder="Ex.: Patrulha Águia" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <Button onClick={save} disabled={saving} className="bg-scout-gradient">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar alterações
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
          Aparência
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Modo escuro</div>
            <div className="text-sm text-muted-foreground">Alterna entre tema claro e escuro</div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <div className="font-medium">Sobre</div>
        <div className="text-sm text-muted-foreground">Versão {APP_VERSION}</div>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          Criado com <Heart className="h-3.5 w-3.5 text-destructive fill-destructive" /> por <span className="font-medium text-foreground">Oldumar Julio</span>
        </div>
      </Card>
    </div>
  );
}
