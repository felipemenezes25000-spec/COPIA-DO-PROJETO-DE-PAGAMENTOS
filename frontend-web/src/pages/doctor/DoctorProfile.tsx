import { useState, useEffect } from 'react';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useDoctorAuth } from '@/contexts/DoctorAuthContext';
import {
  updateAvatar, updateDoctorProfile, changePassword,
  getActiveCertificate, uploadCertificate,
} from '@/services/doctorApi';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Loader2, Mail, Phone, Shield, Upload, Camera,
  Lock, Save, Stethoscope, MapPin, AlertTriangle, FileUp,
} from 'lucide-react';

export default function DoctorProfile() {
  const { user, doctorProfile, refreshUser } = useDoctorAuth();
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasCert, setHasCert] = useState<boolean | null>(null);

  const [profPhone, setProfPhone] = useState(doctorProfile?.professionalPhone || '');
  const [profAddress, setProfAddress] = useState(doctorProfile?.professionalAddress || '');

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [certLoading, setCertLoading] = useState(false);

  useEffect(() => {
    getActiveCertificate()
      .then(data => setHasCert(!!data))
      .catch(() => setHasCert(false));
  }, []);

  useEffect(() => {
    if (doctorProfile) {
      setProfPhone(doctorProfile.professionalPhone || '');
      setProfAddress(doctorProfile.professionalAddress || '');
    }
  }, [doctorProfile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      await updateAvatar(file);
      await refreshUser();
      toast.success('Avatar atualizado');
    } catch {
      toast.error('Erro ao atualizar avatar');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateDoctorProfile({ professionalPhone: profPhone, professionalAddress: profAddress });
      await refreshUser();
      toast.success('Perfil atualizado');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== newPwConfirm) {
      toast.error('Senhas não coincidem');
      return;
    }
    if (newPw.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      toast.success('Senha alterada');
      setPasswordDialogOpen(false);
      setCurrentPw(''); setNewPw(''); setNewPwConfirm('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setPwLoading(false);
    }
  };

  const handleUploadCert = async () => {
    if (!certFile || !certPassword) return;
    setCertLoading(true);
    try {
      await uploadCertificate(certFile, certPassword);
      setHasCert(true);
      toast.success('Certificado enviado');
      setCertDialogOpen(false);
      setCertFile(null); setCertPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar certificado');
    } finally {
      setCertLoading(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'MD';

  return (
    <DoctorLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>

        {/* Avatar + basic info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-2xl object-cover ring-4 ring-primary/10" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-4 ring-primary/10">
                      <span className="text-2xl font-bold text-primary">{initials}</span>
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {avatarLoading ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
                  </label>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{user?.name}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail className="h-3.5 w-3.5" /> {user?.email}
                  </p>
                  {doctorProfile && (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm flex items-center gap-1.5 text-muted-foreground">
                        <Stethoscope className="h-3.5 w-3.5" />
                        CRM {doctorProfile.crm}/{doctorProfile.crmState}
                      </span>
                      <span className="text-sm text-muted-foreground">{doctorProfile.specialty}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Professional info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                Dados Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prof-phone">Telefone profissional</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                  <Input id="prof-phone" value={profPhone} onChange={e => setProfPhone(e.target.value)} placeholder="(11) 3333-4444" className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prof-address">Endereço profissional</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                  <Input id="prof-address" value={profAddress} onChange={e => setProfAddress(e.target.value)} placeholder="Rua, número, bairro..." className="pl-10" />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar alterações
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Certificate */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className={`shadow-sm ${hasCert === false ? 'border-amber-200' : ''}`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${hasCert ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {hasCert ? (
                  <Shield className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {hasCert ? 'Certificado digital ativo' : 'Certificado digital pendente'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasCert ? 'Seu certificado ICP-Brasil está configurado' : 'Envie seu certificado A1 (.pfx) para assinar documentos'}
                </p>
              </div>
              <Button variant={hasCert ? 'outline' : 'default'} size="sm" onClick={() => setCertDialogOpen(true)} className="gap-1.5">
                <FileUp className="h-3.5 w-3.5" />
                {hasCert ? 'Atualizar' : 'Enviar'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" aria-hidden />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" onClick={() => setPasswordDialogOpen(true)} className="gap-2">
                <Lock className="h-4 w-4" />
                Alterar senha
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Password dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>Digite sua senha atual e a nova senha</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)} autoComplete="new-password" />
              {newPwConfirm && newPw !== newPwConfirm && <p className="text-xs text-destructive">Senhas não coincidem</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={pwLoading || !currentPw || !newPw || newPw !== newPwConfirm}>
              {pwLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Alterar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate dialog */}
      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Certificado Digital
            </DialogTitle>
            <DialogDescription>Envie seu certificado A1 (.pfx) e digite a senha</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Arquivo do certificado (.pfx)</Label>
              <Input
                type="file"
                accept=".pfx,.p12"
                onChange={e => setCertFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Senha do certificado</Label>
              <Input type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} placeholder="••••••••" autoComplete="off" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCertDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUploadCert} disabled={certLoading || !certFile || !certPassword} className="gap-2">
              {certLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Enviar certificado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DoctorLayout>
  );
}
