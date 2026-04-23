"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Landmark, Plus, Trash2, Star, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface BankAccount {
  id: string;
  user_id: string;
  cbu: string;
  alias?: string;
  bank_name: string;
  account_holder: string;
  is_default: boolean;
}

const defaultForm = { alias: "", cbu: "", bank_name: "", account_holder: "", is_default: false };

export default function MisCuentas() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current session
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.error) {
          router.push('/login');
          return;
        }

        setUser(data.user);

        // Get user's bank accounts
        const accountsResponse = await fetch(`/api/bank-accounts?userId=${data.user.id}`);
        const accountsData = await accountsResponse.json();

        setAccounts(accountsData || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load bank accounts:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);

  const handleSave = async () => {
    if (!form.cbu.trim() || !form.account_holder.trim()) {
      toast.error("Por favor, completa los campos requeridos");
      return;
    }

    setSaving(true);
    
    try {
      // TODO: Implement Next.js API call for bank account creation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // If setting as default, unset others first
      if (form.is_default) {
        const updatedAccounts = accounts.map(a => ({ ...a, is_default: false }));
        setAccounts(updatedAccounts);
      }
      
      // Create new account
      const newAccount: BankAccount = {
        id: Date.now().toString(),
        ...form,
        user_id: user!.id
      };
      
      setAccounts(prev => [...prev, newAccount]);
      toast.success("Cuenta agregada correctamente");
      setSaving(false);
      setDialogOpen(false);
      setForm(defaultForm);
    } catch (error) {
      setSaving(false);
      toast.error("Error al agregar cuenta");
    }
  };

  const handleDelete = async (account: BankAccount) => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta ${account.bank_name}?`)) {
      return;
    }

    try {
      // TODO: Implement Next.js API call for bank account deletion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAccounts(prev => prev.filter(a => a.id !== account.id));
      toast.success("Cuenta eliminada");
    } catch (error) {
      toast.error("Error al eliminar cuenta");
    }
  };

  const handleSetDefault = async (account: BankAccount) => {
    try {
      // TODO: Implement Next.js API call for updating default account
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update all accounts
      const updatedAccounts = accounts.map(a => ({
        ...a,
        is_default: a.id === account.id
      }));
      
      setAccounts(updatedAccounts);
      toast.success("Cuenta predeterminada actualizada");
    } catch (error) {
      toast.error("Error al actualizar cuenta predeterminada");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-24">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Landmark className="w-8 h-8 text-violet-400" />
              Mis Cuentas
            </h1>
            <p className="text-slate-500 mt-2">
              Cuentas bancarias para la devolución de saldos al finalizar eventos
            </p>
          </div>
          <Button
            onClick={() => { setForm(defaultForm); setDialogOpen(true); }}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 gap-2"
          >
            <Plus className="w-4 h-4" /> Agregar
          </Button>
        </div>

        {/* Info banner */}
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4 flex items-start gap-3 mb-6">
          <ShieldCheck className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-400 leading-relaxed">
            Al finalizar cada evento, el saldo disponible que no fue consumido se devuelve
            automáticamente a tu cuenta predeterminada. Asegurate de tener una cuenta cargada antes del evento.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-20">
            <Landmark className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No tenés cuentas cargadas</p>
            <p className="text-slate-600 text-sm mt-1">
              Agregá un CBU/CVU para recibir devoluciones de saldo
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold">{account.bank_name || "Cuenta bancaria"}</p>
                      {account.is_default && (
                        <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/30 border text-xs">
                          Predeterminada
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">{account.account_holder}</p>
                    <p className="text-slate-500 text-xs font-mono mt-1">{account.cbu}</p>
                    {account.alias && (
                      <p className="text-slate-600 text-xs mt-0.5">Alias: {account.alias}</p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-3">
                    {!account.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetDefault(account)}
                        className="text-slate-500 hover:text-violet-400 h-8 w-8"
                        title="Establecer como predeterminada"
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account)}
                      className="text-slate-500 hover:text-red-400 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Agregar cuenta bancaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-slate-400 text-xs mb-1.5 block">CBU / CVU *</Label>
              <Input
                value={form.cbu}
                onChange={(e) => setForm({ ...form, cbu: e.target.value })}
                placeholder="22 dígitos del CBU o CVU"
                className="bg-slate-800/50 border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs mb-1.5 block">Alias (opcional)</Label>
              <Input
                value={form.alias}
                onChange={(e) => setForm({ ...form, alias: e.target.value })}
                placeholder="mi.alias.mercadopago"
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs mb-1.5 block">Banco / Billetera</Label>
              <Input
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="Ej: Mercado Pago, Banco Nación..."
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs mb-1.5 block">Titular de la cuenta *</Label>
              <Input
                value={form.account_holder}
                onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                placeholder="Nombre y apellido"
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Label className="text-slate-300 text-sm">Establecer como predeterminada</Label>
              <Switch
                checked={form.is_default}
                onCheckedChange={(v) => setForm({ ...form, is_default: v })}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !form.cbu || !form.account_holder}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar cuenta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
