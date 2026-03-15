truncate table
  public.medication_contraindication_rules,
  public.medication_interaction_rules,
  public.medication_catalog_ingredients,
  public.medication_catalog,
  public.active_ingredients,
  public.attachments,
  public.interaction_checks,
  public.scanned_inserts,
  public.vitals,
  public.encounters,
  public.current_medications,
  public.patient_conditions,
  public.patient_allergies,
  public.patients
restart identity cascade;

insert into public.active_ingredients (
  id,
  canonical_name,
  normalized_name,
  common_name,
  ingredient_class,
  synonyms_json
) values
  (
    '10000000-0000-0000-0000-000000000001',
    'Paracetamol',
    'paracetamol',
    'Acetaminophen',
    'analgesic_antipyretic',
    '["acetaminophen"]'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Ibuprofen',
    'ibuprofen',
    null,
    'nsaid',
    '[]'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Amoxicillin',
    'amoxicillin',
    null,
    'antibiotic',
    '["amoxil"]'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Pantoprazole',
    'pantoprazole',
    null,
    'proton_pump_inhibitor',
    '["pantoprazole sodium", "pantoprazole sodium sesquihydrate"]'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Loperamide',
    'loperamide',
    null,
    'antidiarrheal',
    '["loperamide hydrochloride"]'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    'Warfarin',
    'warfarin',
    null,
    'anticoagulant',
    '[]'::jsonb
  );

insert into public.medication_catalog (
  id,
  brand_name,
  generic_name,
  normalized_brand_name,
  dosage_form,
  strength_text,
  manufacturer_name,
  source_name,
  notes
) values
  (
    '20000000-0000-0000-0000-000000000001',
    'Panado Capsules',
    'Paracetamol',
    'panado capsules',
    'capsule',
    '500 mg',
    'Adcock Ingram',
    'manual_seed',
    'Common analgesic demo entry'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'PRAZOLOC 20',
    'Pantoprazole',
    'prazoloc 20',
    'enteric-coated tablet',
    '20 mg',
    'Cipla Medpro',
    'manual_seed',
    'Common proton pump inhibitor demo entry'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'PRAZOLOC 40',
    'Pantoprazole',
    'prazoloc 40',
    'enteric-coated tablet',
    '40 mg',
    'Cipla Medpro',
    'manual_seed',
    'Common proton pump inhibitor demo entry'
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    'CIPLA LOPERAMIDE',
    'Loperamide',
    'cipla loperamide',
    'tablet',
    '2 mg',
    'Cipla Medpro',
    'manual_seed',
    'Common anti-diarrhoeal demo entry'
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'Amoxil',
    'Amoxicillin',
    'amoxil',
    'capsule',
    '500 mg',
    'Demo',
    'manual_seed',
    'Common antibiotic demo entry'
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    'Advil',
    'Ibuprofen',
    'advil',
    'tablet',
    '200 mg',
    'Demo',
    'manual_seed',
    'Common NSAID demo entry'
  );

insert into public.medication_catalog_ingredients (
  id,
  medication_id,
  ingredient_id,
  strength_text,
  sort_order,
  is_primary
) values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '500 mg',
    1,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    '20 mg',
    1,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '40 mg',
    1,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005',
    '2 mg',
    1,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000003',
    '500 mg',
    1,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000006',
    '20000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000002',
    '200 mg',
    1,
    true
  );

insert into public.medication_interaction_rules (
  id,
  ingredient_id,
  interacting_name,
  interacting_type,
  severity,
  effect_text,
  guidance_text,
  source_name
) values
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'Warfarin',
    'drug',
    'severe',
    'May increase the risk of bleeding.',
    'Manual review required before administration.',
    'manual_seed'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    'Atazanavir',
    'drug',
    'severe',
    'May reduce antiviral efficacy or be contraindicated.',
    'Avoid co-administration.',
    'manual_seed'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    'Nelfinavir',
    'drug',
    'severe',
    'May reduce antiviral efficacy or be contraindicated.',
    'Avoid co-administration.',
    'manual_seed'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000004',
    'Warfarin',
    'drug',
    'high',
    'Potential increased bleeding risk or altered anticoagulant effect.',
    'Check INR and review clinically.',
    'manual_seed'
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000005',
    'Quinidine',
    'drug',
    'high',
    'May increase loperamide exposure via P-glycoprotein inhibition.',
    'Use caution and review dose.',
    'manual_seed'
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000005',
    'Ritonavir',
    'drug',
    'high',
    'May increase loperamide exposure via P-glycoprotein inhibition.',
    'Use caution and review dose.',
    'manual_seed'
  );

insert into public.medication_contraindication_rules (
  id,
  ingredient_id,
  contraindication_name,
  contraindication_type,
  severity,
  guidance_text,
  source_name
) values
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    'Penicillin allergy',
    'allergy',
    'severe',
    'Avoid amoxicillin in patients with penicillin allergy.',
    'manual_seed'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    'Severe liver impairment',
    'organ_function',
    'high',
    'Use with caution or avoid depending on severity.',
    'manual_seed'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000005',
    'Children under 2 years',
    'age',
    'severe',
    'Do not use in children younger than 2 years.',
    'manual_seed'
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005',
    'Acute dysentery',
    'condition',
    'high',
    'Not recommended as primary therapy.',
    'manual_seed'
  );

insert into public.patients (
  id,
  external_id,
  full_name,
  dob,
  sex,
  pregnancy_status,
  location_text
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'FIELD-001',
    'Amina Dlamini',
    '1992-04-11',
    'female',
    'pregnant',
    'Rural outreach unit'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'FIELD-002',
    'David Moyo',
    '1984-09-23',
    'male',
    'not_pregnant',
    'Mobile clinic west'
  );

insert into public.patient_allergies (
  id,
  patient_id,
  allergen_name,
  allergen_type,
  severity,
  notes
) values
  (
    '31111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'penicillin',
    'drug',
    'severe',
    'Documented severe allergy'
  );

insert into public.patient_conditions (
  id,
  patient_id,
  condition_name,
  notes
) values
  (
    '41111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'pregnancy',
    'Second trimester'
  );

insert into public.current_medications (
  id,
  patient_id,
  med_name,
  active_ingredients_json,
  dose_text,
  route_text,
  started_at
) values
  (
    '51111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Warfarin',
    '["warfarin"]'::jsonb,
    '5 mg daily',
    'oral',
    timezone('utc', now()) - interval '30 days'
  ),
  (
    '52222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Paracetamol',
    '["paracetamol"]'::jsonb,
    '500 mg as needed',
    'oral',
    timezone('utc', now()) - interval '7 days'
  );

insert into public.encounters (
  id,
  patient_id,
  clinician_id,
  encounter_type,
  notes_text,
  ai_summary,
  status
) values
  (
    '61111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    null,
    'field_followup',
    'Patient reviewed during outreach visit. Medication insert scanned for safety check.',
    'Field follow-up with medication review.',
    'completed'
  );

insert into public.vitals (
  id,
  encounter_id,
  temperature_c,
  pulse_bpm,
  blood_pressure_sys,
  blood_pressure_dia,
  spo2,
  respiration_rate,
  weight_kg
) values
  (
    '71111111-1111-1111-1111-111111111111',
    '61111111-1111-1111-1111-111111111111',
    37.1,
    88,
    118,
    74,
    98,
    16,
    68.4
  );

insert into public.scanned_inserts (
  id,
  encounter_id,
  image_path,
  raw_ocr_text,
  extracted_json,
  extraction_confidence,
  extraction_status,
  reviewed_by_clinician
) values
  (
    '81111111-1111-1111-1111-111111111111',
    '61111111-1111-1111-1111-111111111111',
    'scans/amoxicillin-insert-001.jpg',
    'Amoxicillin. Contraindications include allergy to penicillins. Use caution in pregnancy. Interactions noted with anticoagulants.',
    '{
      "medicine_name": "Amoxicillin",
      "brand_name": "Amoxicillin",
      "active_ingredients": ["amoxicillin"],
      "indications": ["bacterial infection"],
      "contraindications": ["allergy to penicillins"],
      "drug_interactions": [
        {
          "substance": "warfarin",
          "effect": "increased bleeding risk",
          "severity": "high"
        }
      ],
      "pregnancy_warning": "Use only if clearly needed and review clinically.",
      "lactation_warning": "Use with caution.",
      "dosage_guidance": "Follow clinician instructions.",
      "age_warnings": [],
      "source_sections": {
        "contraindications": "Contraindications",
        "interactions": "Drug interactions",
        "dosage": "Dosage"
      },
      "confidence": 0.94
    }'::jsonb,
    0.94,
    'reviewed',
    true
  );

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
  (
    '91111111-1111-1111-1111-111111111111',
    '61111111-1111-1111-1111-111111111111',
    '81111111-1111-1111-1111-111111111111',
    'warning_found',
    'red',
    '[
      {
        "code": "allergy_overlap",
        "severity": "red",
        "reason": "Active ingredient conflicts with severe penicillin allergy."
      },
      {
        "code": "drug_interaction",
        "severity": "red",
        "reason": "Insert warns about interaction with warfarin."
      },
      {
        "code": "pregnancy_caution",
        "severity": "yellow",
        "reason": "Pregnancy caution present in insert."
      }
    ]'::jsonb,
    'note',
    'Manual review required before administration.'
  );

insert into public.attachments (
  id,
  encounter_id,
  storage_path,
  mime_type
) values
  (
    'a1111111-1111-1111-1111-111111111111',
    '61111111-1111-1111-1111-111111111111',
    'attachments/encounter-61111111/voice-note-001.m4a',
    'audio/mp4'
  );
