-- Enable Row Level Security on public-facing tables.
-- Resolves rls_disabled_in_public lint errors on public.clients and public.events.
--
-- There is no user-level auth in this app (intentional — small shared team).
-- Policies grant full access to the anon role so the existing behaviour is preserved.

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_clients"
  ON public.clients
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_all_events"
  ON public.events
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
