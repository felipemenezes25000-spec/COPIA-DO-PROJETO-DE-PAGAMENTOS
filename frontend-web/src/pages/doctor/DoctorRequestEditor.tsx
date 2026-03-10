import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  getRequestById, updatePrescriptionContent, updateExamContent, updateConduct,
  getPreviewPdf, getPreviewExamPdf, signRequest,
  type MedicalRequest, type Medication, type ExamItem,
} from '@/services/doctorApi';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Loader2, ArrowLeft, Plus, Trash2, Save, FileSignature, Eye, Pill,
  FlaskConical, FileText, AlertTriangle, Lock, CheckCircle2,
} from 'lucide-react';

export default function DoctorRequestEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<MedicalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [certPassword, setCertPassword] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [medications, setMedications] = useState<Medication[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [notes, setNotes] = useState('');
  const [conductNotes, setConductNotes] = useState('');
  const [prescriptionKind, setPrescriptionKind] = useState('simple');

  useEffect(() => {
    if (!id) return;
    getRequestById(id)
      .then(data => {
        setRequest(data);
        setMedications(data.medications || [{ name: '', dosage: '', frequency: '', duration: '' }]);
        setExams(data.exams || [{ name: '', notes: '' }]);
        setNotes(data.notes || '');
        setConductNotes(data.doctorConductNotes || '');
        setPrescriptionKind(data.prescriptionKind || 'simple');
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [id]);

  const addMedication = () => setMedications(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  const removeMedication = (i: number) => setMedications(prev => prev.filter((_, idx) => idx !== i));
  const updateMedication = (i: number, field: keyof Medication, val: string) => {
    setMedications(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));
  };

  const addExam = () => setExams(prev => [...prev, { name: '', notes: '' }]);
  const removeExam = (i: number) => setExams(prev => prev.filter((_, idx) => idx !== i));
  const updateExam = (i: number, field: keyof ExamItem, val: string) => {
    setExams(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  };

  const handleSave = async () => {
    if (!id || !request) return;
    setSaving(true);
    try {
      if (request.type === 'prescription') {
        await updatePrescriptionContent(id, { medications, notes, prescriptionKind });
      } else if (request.type === 'exam') {
        await updateExamContent(id, { exams, notes });
      }
      if (conductNotes !== request.doctorConductNotes) {
        await updateConduct(id, { conductNotes });
      }
      toast.success('Salvo com sucesso');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!id || !request) return;
    setPdfLoading(true);
    try {
      await handleSave();
      const url = request.type === 'exam' ? await getPreviewExamPdf(id) : await getPreviewPdf(id);
      setPdfUrl(url);
    } catch {
      toast.error('Erro ao gerar preview');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSign = async () => {
    if (!id || !certPassword) return;
    setSigning(true);
    try {
      await handleSave();
      await signRequest(id, certPassword);
      toast.success('Documento assinado digitalmente!');
      setSignDialogOpen(false);
      navigate(`/pedidos/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao assinar');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DoctorLayout>
    );
  }

  if (!request) {
    return (
      <DoctorLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Pedido não encontrado</p>
        </div>
      </DoctorLayout>
    );
  }

  const isPrescription = request.type === 'prescription';
  const canSign = request.status === 'paid';

  return (
    <DoctorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/pedidos/${id}`)} aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Editor — {isPrescription ? 'Receita' : 'Exame'}
              </h1>
              <p className="text-sm text-muted-foreground">{request.patientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePreviewPdf} disabled={pdfLoading} className="gap-2">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview PDF
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            {canSign && (
              <Button onClick={() => setSignDialogOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <FileSignature className="h-4 w-4" />
                Assinar
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Editor */}
          <div className="lg:col-span-3 space-y-5">
            {/* Prescription kind */}
            {isPrescription && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" aria-hidden />
                      Tipo de Receita
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select value={prescriptionKind} onValueChange={setPrescriptionKind}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Receita Simples</SelectItem>
                        <SelectItem value="antimicrobial">Receita Antimicrobiano</SelectItem>
                        <SelectItem value="controlled">Receita Controle Especial</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Items */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {isPrescription ? <Pill className="h-4 w-4 text-primary" /> : <FlaskConical className="h-4 w-4 text-primary" />}
                      {isPrescription ? 'Medicamentos' : 'Exames'}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isPrescription ? addMedication : addExam}
                      className="gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {isPrescription ? (
                    medications.map((med, i) => (
                      <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/30 space-y-3 relative group">
                        {medications.length > 1 && (
                          <button
                            onClick={() => removeMedication(i)}
                            className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            aria-label="Remover medicamento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div>
                          <Label className="text-xs">Nome do medicamento</Label>
                          <Input value={med.name} onChange={e => updateMedication(i, 'name', e.target.value)} placeholder="Ex: Amoxicilina 500mg" className="mt-1" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Dosagem</Label>
                            <Input value={med.dosage} onChange={e => updateMedication(i, 'dosage', e.target.value)} placeholder="500mg" className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Frequência</Label>
                            <Input value={med.frequency} onChange={e => updateMedication(i, 'frequency', e.target.value)} placeholder="8/8h" className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Duração</Label>
                            <Input value={med.duration} onChange={e => updateMedication(i, 'duration', e.target.value)} placeholder="7 dias" className="mt-1" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Observações</Label>
                          <Input value={med.notes || ''} onChange={e => updateMedication(i, 'notes', e.target.value)} placeholder="Tomar após refeição" className="mt-1" />
                        </div>
                      </div>
                    ))
                  ) : (
                    exams.map((exam, i) => (
                      <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/30 space-y-3 relative group">
                        {exams.length > 1 && (
                          <button
                            onClick={() => removeExam(i)}
                            className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            aria-label="Remover exame"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div>
                          <Label className="text-xs">Nome do exame</Label>
                          <Input value={exam.name} onChange={e => updateExam(i, 'name', e.target.value)} placeholder="Ex: Hemograma completo" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Observações</Label>
                          <Input value={exam.notes || ''} onChange={e => updateExam(i, 'notes', e.target.value)} placeholder="Jejum de 8h" className="mt-1" />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Notes */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Observações</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Observações gerais para o documento..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Conduct */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Conduta Médica</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Textarea
                    value={conductNotes}
                    onChange={e => setConductNotes(e.target.value)}
                    placeholder="Anotações sobre conduta clínica..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* PDF Preview */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" aria-hidden />
                    Preview do Documento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {pdfUrl ? (
                    <div className="rounded-lg overflow-hidden border border-border bg-white">
                      <object
                        data={pdfUrl}
                        type="application/pdf"
                        className="w-full"
                        style={{ height: '70vh', minHeight: 400 }}
                        aria-label="Preview do PDF"
                      >
                        <p className="p-4 text-sm text-muted-foreground text-center">
                          Não foi possível exibir o PDF.{' '}
                          <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                            Abrir em nova aba
                          </a>
                        </p>
                      </object>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border border-dashed border-border bg-muted/30">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">Clique em "Preview PDF" para visualizar</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Suggestion */}
              {request.aiConductSuggestion && (
                <Card className="shadow-sm mt-4 border-primary/20 bg-primary/[0.02]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary" aria-hidden />
                      Sugestão da IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs whitespace-pre-wrap text-muted-foreground">{request.aiConductSuggestion}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sign dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Assinatura Digital
            </DialogTitle>
            <DialogDescription>
              Digite a senha do seu certificado digital (A1/PFX) para assinar o documento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="cert-password">Senha do certificado</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                id="cert-password"
                type="password"
                placeholder="••••••••"
                value={certPassword}
                onChange={e => setCertPassword(e.target.value)}
                className="pl-10"
                autoComplete="off"
              />
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              <div className="flex items-center gap-2 font-medium mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Assinatura segura
              </div>
              O documento será assinado com seu certificado ICP-Brasil cadastrado na plataforma.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSignDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSign}
              disabled={signing || !certPassword}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Assinar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DoctorLayout>
  );
}
