-- Política de Storage para consultation-transcripts: backend (service_role) pode inserir e ler.
-- Sem isso, o upload falha mesmo com service_role.
-- Execute no SQL Editor: https://supabase.com/dashboard/project/ifgxgppxsawauaceudec/sql

DROP POLICY IF EXISTS "Service role full access consultation-transcripts" ON storage.objects;

CREATE POLICY "Service role full access consultation-transcripts"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'consultation-transcripts')
  WITH CHECK (bucket_id = 'consultation-transcripts');
