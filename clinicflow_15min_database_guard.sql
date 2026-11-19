-- ClinicFlow reference SQL: already installed and tested on the project's live Supabase database.
-- Do not run this against a different project without reviewing existing triggers and policies.
-- Existing off-grid appointments remain intact; new/rescheduled active bookings follow 15-minute rules.
CREATE OR REPLACE FUNCTION public.validate_clinicflow_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  p_name text;
  v_active boolean;
  v_requires_slot_check boolean;
  v_date_time timestamp;
BEGIN
  SELECT full_name INTO p_name
  FROM public.profiles WHERE id = NEW.patient_id;
  IF p_name IS NULL THEN RAISE EXCEPTION 'Unknown patient' USING ERRCODE='23503'; END IF;
  NEW.patient := p_name;
  IF TG_OP = 'INSERT' THEN NEW.created_by := (SELECT auth.uid()); END IF;

  v_active := lower(pg_catalog.btrim(NEW.status)) NOT IN ('cancelled','canceled','no show');
  v_requires_slot_check := TG_OP = 'INSERT';
  IF TG_OP = 'UPDATE' THEN
    v_requires_slot_check :=
      (OLD.date, OLD.time, lower(pg_catalog.btrim(OLD.doctor))) IS DISTINCT FROM
      (NEW.date, NEW.time, lower(pg_catalog.btrim(NEW.doctor)))
      OR (
        lower(pg_catalog.btrim(OLD.status)) IN ('cancelled','canceled','no show')
        AND v_active
      );
  END IF;

  IF v_active AND v_requires_slot_check THEN
    IF (extract(minute from NEW.time::time)::integer % 15) <> 0 THEN
      RAISE EXCEPTION 'Appointments must start every 15 minutes (e.g. 09:00, 09:15, 09:30, 09:45).'
        USING ERRCODE='23514';
    END IF;

    -- Doctor-scoped transaction lock avoids two concurrent writers claiming one time.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      27182, pg_catalog.hashtext(lower(pg_catalog.btrim(NEW.doctor)))
    );
    v_date_time := NEW.date::timestamp + NEW.time::time;
    IF EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id IS DISTINCT FROM NEW.id
        AND lower(pg_catalog.btrim(a.doctor)) = lower(pg_catalog.btrim(NEW.doctor))
        AND lower(pg_catalog.btrim(a.status)) NOT IN ('cancelled','canceled','no show')
        AND abs(extract(epoch from
          ((a.date::timestamp + a.time::time) - v_date_time)
        )) < 900
    ) THEN
      RAISE EXCEPTION 'That appointment slot is already booked. Please select another 15-minute time.'
        USING ERRCODE='23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.validate_clinicflow_appointment() FROM PUBLIC, anon, authenticated;
