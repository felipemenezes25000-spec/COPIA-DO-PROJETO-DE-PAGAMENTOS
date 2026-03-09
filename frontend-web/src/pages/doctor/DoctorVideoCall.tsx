import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getRequestById, getVideoToken, type MedicalRequest } from '@/services/doctorApi';
import {
  Loader2, ArrowLeft,
  User, AlertTriangle, ExternalLink,
} from 'lucide-react';

export default function DoctorVideoCall() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<MedicalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    getRequestById(requestId)
      .then(async (data) => {
        setRequest(data);
        try {
          const tokenData = await getVideoToken(requestId);
          setRoomUrl(tokenData.url || tokenData.roomUrl);
        } catch {
          if (data.videoRoomUrl) {
            setRoomUrl(data.videoRoomUrl);
          } else {
            setError('Não foi possível obter o link da videochamada');
          }
        }
      })
      .catch(() => setError('Erro ao carregar dados da consulta'))
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Preparando videochamada...</p>
        </div>
      </div>
    );
  }

  if (error || !roomUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold mb-2">Videochamada indisponível</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {error || 'O link da videochamada não está disponível. Verifique se a consulta foi aceita.'}
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate(`/pedidos/${requestId}`)} className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Ver detalhes da consulta
              </Button>
              <Button variant="outline" onClick={() => navigate('/consultas')} className="w-full">
                Voltar às consultas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/pedidos/${requestId}`)}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-gray-300 font-medium">Consulta em andamento</span>
          </div>
        </div>
        {request && (
          <div className="flex items-center gap-2 text-gray-400">
            <User className="h-4 w-4" />
            <span className="text-sm">{request.patientName}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-gray-800 gap-1.5"
          onClick={() => window.open(roomUrl, '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir em nova aba
        </Button>
      </div>

      {/* Video iframe */}
      <div className="flex-1 relative">
        <iframe
          src={roomUrl}
          allow="camera; microphone; display-capture; autoplay; clipboard-write"
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 60px)' }}
          title="Videochamada"
        />
      </div>
    </div>
  );
}
