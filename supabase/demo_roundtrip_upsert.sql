-- Non-destructive demo seed for hosted Supabase.
-- Safe to re-run: uses deterministic IDs and UPSERTs.

insert into public.active_ingredients (
  id,
  canonical_name,
  normalized_name,
  common_name,
  ingredient_class,
  synonyms_json
) values
  ('10000000-0000-0000-0000-000000000003', 'Amoxicillin', 'amoxicillin', null, 'antibiotic', '["amoxil"]'::jsonb),
  ('10000000-0000-0000-0000-000000000004', 'Pantoprazole', 'pantoprazole', null, 'proton_pump_inhibitor', '["pantoprazole sodium", "pantoprazole sodium sesquihydrate"]'::jsonb),
  ('10000000-0000-0000-0000-000000000006', 'Warfarin', 'warfarin', null, 'anticoagulant', '[]'::jsonb)
on conflict (id) do update set
  canonical_name = excluded.canonical_name,
  normalized_name = excluded.normalized_name,
  common_name = excluded.common_name,
  ingredient_class = excluded.ingredient_class,
  synonyms_json = excluded.synonyms_json;

insert into public.medication_catalog (
  id,
  brand_name,
  generic_name,
  normalized_brand_name,
  dosage_form,
  strength_text,
  manufacturer_name,
  source_name,
  notes,
  is_active
) values
  ('20000000-0000-0000-0000-000000000002', 'PRAZOLOC 20', 'Pantoprazole', 'prazoloc 20', 'enteric-coated tablet', '20 mg', 'Cipla Medpro', 'demo_roundtrip', 'Hosted demo reference row', true),
  ('20000000-0000-0000-0000-000000000005', 'Amoxil', 'Amoxicillin', 'amoxil', 'capsule', '500 mg', 'Demo', 'demo_roundtrip', 'Hosted demo reference row', true)
on conflict (id) do update set
  brand_name = excluded.brand_name,
  generic_name = excluded.generic_name,
  normalized_brand_name = excluded.normalized_brand_name,
  dosage_form = excluded.dosage_form,
  strength_text = excluded.strength_text,
  manufacturer_name = excluded.manufacturer_name,
  source_name = excluded.source_name,
  notes = excluded.notes,
  is_active = excluded.is_active;

insert into public.medication_catalog_ingredients (
  id,
  medication_id,
  ingredient_id,
  strength_text,
  sort_order,
  is_primary
) values
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '20 mg', 1, true),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '500 mg', 1, true)
on conflict (id) do update set
  medication_id = excluded.medication_id,
  ingredient_id = excluded.ingredient_id,
  strength_text = excluded.strength_text,
  sort_order = excluded.sort_order,
  is_primary = excluded.is_primary;

insert into public.medication_interaction_rules (
  id,
  ingredient_id,
  interacting_name,
  interacting_type,
  severity,
  effect_text,
  guidance_text,
  source_name,
  is_active
) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Warfarin', 'drug', 'severe', 'May increase the risk of bleeding.', 'Manual review required before administration.', 'demo_roundtrip', true),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Warfarin', 'drug', 'high', 'Potential increased bleeding risk or altered anticoagulant effect.', 'Check INR and review clinically.', 'demo_roundtrip', true)
on conflict (id) do update set
  ingredient_id = excluded.ingredient_id,
  interacting_name = excluded.interacting_name,
  interacting_type = excluded.interacting_type,
  severity = excluded.severity,
  effect_text = excluded.effect_text,
  guidance_text = excluded.guidance_text,
  source_name = excluded.source_name,
  is_active = excluded.is_active;

insert into public.medication_contraindication_rules (
  id,
  ingredient_id,
  contraindication_name,
  contraindication_type,
  severity,
  guidance_text,
  source_name,
  is_active
) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Penicillin allergy', 'allergy', 'severe', 'Avoid amoxicillin in patients with penicillin allergy.', 'demo_roundtrip', true),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'Severe liver impairment', 'organ_function', 'high', 'Use with caution or avoid depending on severity.', 'demo_roundtrip', true)
on conflict (id) do update set
  ingredient_id = excluded.ingredient_id,
  contraindication_name = excluded.contraindication_name,
  contraindication_type = excluded.contraindication_type,
  severity = excluded.severity,
  guidance_text = excluded.guidance_text,
  source_name = excluded.source_name,
  is_active = excluded.is_active;

insert into public.patients (
  id,
  external_id,
  full_name,
  dob,
  sex,
  pregnancy_status,
  location_text
) values
  ('11111111-1111-1111-1111-111111111111', 'FIELD-001', 'Amina Dlamini', '1992-04-11', 'female', 'pregnant', 'Rural outreach unit'),
  ('22222222-2222-2222-2222-222222222222', 'FIELD-002', 'David Moyo', '1984-09-23', 'male', 'not_pregnant', 'Mobile clinic west')
on conflict (id) do update set
  external_id = excluded.external_id,
  full_name = excluded.full_name,
  dob = excluded.dob,
  sex = excluded.sex,
  pregnancy_status = excluded.pregnancy_status,
  location_text = excluded.location_text;

insert into public.patient_allergies (
  id,
  patient_id,
  allergen_name,
  allergen_type,
  severity,
  notes
) values
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'penicillin', 'drug', 'severe', 'Documented severe allergy')
on conflict (id) do update set
  patient_id = excluded.patient_id,
  allergen_name = excluded.allergen_name,
  allergen_type = excluded.allergen_type,
  severity = excluded.severity,
  notes = excluded.notes;

insert into public.patient_conditions (
  id,
  patient_id,
  condition_name,
  notes
) values
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'pregnancy', 'Second trimester')
on conflict (id) do update set
  patient_id = excluded.patient_id,
  condition_name = excluded.condition_name,
  notes = excluded.notes;

insert into public.current_medications (
  id,
  patient_id,
  med_name,
  active_ingredients_json,
  dose_text,
  route_text,
  started_at
) values
  ('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Warfarin', '["warfarin"]'::jsonb, '5 mg daily', 'oral', timezone('utc', now()) - interval '30 days')
on conflict (id) do update set
  patient_id = excluded.patient_id,
  med_name = excluded.med_name,
  active_ingredients_json = excluded.active_ingredients_json,
  dose_text = excluded.dose_text,
  route_text = excluded.route_text,
  started_at = excluded.started_at;

insert into public.encounters (
  id,
  patient_id,
  clinician_id,
  encounter_type,
  notes_text,
  ai_summary,
  status
) values
  ('61111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', null, 'field_followup', 'Patient reviewed during outreach visit. Medication insert scanned for safety check.', 'Field follow-up with medication review.', 'completed')
on conflict (id) do update set
  patient_id = excluded.patient_id,
  clinician_id = excluded.clinician_id,
  encounter_type = excluded.encounter_type,
  notes_text = excluded.notes_text,
  ai_summary = excluded.ai_summary,
  status = excluded.status;

insert into public.interaction_checks (
  id,
  encounter_id,
  scanned_insert_id,
  result_status,
  severity,
  warnings_json,
  clinician_action,
  clinician_note
) values
  ('91111111-1111-1111-1111-111111111111', '61111111-1111-1111-1111-111111111111', null, 'warning_found', 'red', '[{"code":"allergy_overlap","severity":"red","reason":"Active ingredient conflicts with severe penicillin allergy."},{"code":"drug_interaction","severity":"red","reason":"Current warfarin therapy creates a major bleeding risk."}]'::jsonb, 'dismiss', 'Medication not given. Alternative required.')
on conflict (id) do update set
  encounter_id = excluded.encounter_id,
  scanned_insert_id = excluded.scanned_insert_id,
  result_status = excluded.result_status,
  severity = excluded.severity,
  warnings_json = excluded.warnings_json,
  clinician_action = excluded.clinician_action,
  clinician_note = excluded.clinician_note;
