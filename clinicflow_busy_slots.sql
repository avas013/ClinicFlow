-- Already installed in the live ClinicFlow database by ChatGPT.
-- Authenticated users receive ONLY booked times (never patient identities).
-- All booking writes are independently checked by validate_clinicflow_appointment().
CREATE OR REPLACE FUNCTION public.clinicflow_busy_slots(p_date date, p_doctor text)
RETURNS TABLE(slot_time text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT pg_catalog.to_char(
    pg_catalog.make_time(gs.i / 4, (gs.i % 4) * 15, 0), 'HH24:MI'
  ) AS slot_time
  FROM pg_catalog.generate_series(0,95) AS gs(i)
  WHERE (select auth.uid()) IS NOT NULL
    AND p_date IS NOT NULL
    AND nullif(pg_catalog.btrim(p_doctor),'') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.date = p_date
        AND lower(pg_catalog.btrim(a.doctor)) = lower(pg_catalog.btrim(p_doctor))
        AND lower(pg_catalog.btrim(a.status)) NOT IN ('cancelled','canceled','no show')
        AND abs(extract(epoch FROM (
          (a.date::timestamp + a.time::time) -
          (p_date::timestamp + pg_catalog.make_time(gs.i / 4, (gs.i % 4) * 15, 0))
        ))) < 900
    );
$function$;
REVOKE ALL ON FUNCTION public.clinicflow_busy_slots(date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clinicflow_busy_slots(date,text) TO authenticated;
