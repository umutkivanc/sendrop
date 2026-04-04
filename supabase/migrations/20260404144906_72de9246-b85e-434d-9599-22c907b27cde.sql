-- Create files table
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '3 days'),
  is_downloaded BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on files"
  ON public.files FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Create ip_blocks table
CREATE TABLE public.ip_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  keyword TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMP WITH TIME ZONE,
  UNIQUE(ip_address, keyword)
);

ALTER TABLE public.ip_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ip_blocks"
  ON public.ip_blocks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false);

CREATE POLICY "Service role can upload files"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'files');

CREATE POLICY "Service role can read files"
  ON storage.objects FOR SELECT TO service_role
  USING (bucket_id = 'files');

CREATE POLICY "Service role can delete files"
  ON storage.objects FOR DELETE TO service_role
  USING (bucket_id = 'files');