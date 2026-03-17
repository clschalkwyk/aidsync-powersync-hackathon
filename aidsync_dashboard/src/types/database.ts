// Types derived from the real Supabase schema migrations
// Source of truth: /supabase/migrations/

export type UserRole = 'clinician' | 'supervisor' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

// Clinical Tables
export interface Patient {
  id: string;
  external_id: string | null;
  full_name: string;
  dob: string | null;
  sex: string | null;
  pregnancy_status: string | null;
  location_text: string | null;
  created_at: string;
  updated_at: string;
}

export type AllergySeverity = 'low' | 'medium' | 'high' | 'severe';

export interface PatientAllergy {
  id: string;
  patient_id: string;
  allergen_name: string;
  allergen_type: string | null;
  severity: AllergySeverity | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientCondition {
  id: string;
  patient_id: string;
  condition_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentMedication {
  id: string;
  patient_id: string;
  med_name: string;
  active_ingredients_json: unknown[];
  dose_text: string | null;
  route_text: string | null;
  started_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EncounterStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled' | 'synced';

export interface Encounter {
  id: string;
  patient_id: string;
  clinician_id: string | null;
  encounter_type: string | null;
  notes_text: string | null;
  ai_summary: string | null;
  supervisor_review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  status: EncounterStatus;
  created_at: string;
  updated_at: string;
}

export interface Vital {
  id: string;
  encounter_id: string;
  temperature_c: number | null;
  pulse_bpm: number | null;
  blood_pressure_sys: number | null;
  blood_pressure_dia: number | null;
  spo2: number | null;
  respiration_rate: number | null;
  weight_kg: number | null;
  created_at: string;
  updated_at: string;
}

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reviewed';

export interface ScannedInsert {
  id: string;
  encounter_id: string;
  image_path: string | null;
  raw_ocr_text: string | null;
  extracted_json: Record<string, unknown>;
  extraction_confidence: number | null;
  extraction_status: ExtractionStatus;
  reviewed_by_clinician: boolean;
  created_at: string;
  updated_at: string;
}

export type InteractionResultStatus = 'no_match' | 'warning_found' | 'manual_review_required' | 'dismissed';
export type InteractionSeverity = 'green' | 'yellow' | 'red';
export type ClinicianAction = 'accept' | 'dismiss' | 'note';

export interface InteractionCheck {
  id: string;
  encounter_id: string;
  scanned_insert_id: string | null;
  result_status: InteractionResultStatus;
  severity: InteractionSeverity;
  warnings_json: unknown[];
  clinician_action: ClinicianAction | null;
  clinician_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  encounter_id: string;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

// Reference Tables
export interface ActiveIngredient {
  id: string;
  canonical_name: string;
  normalized_name: string;
  common_name: string | null;
  ingredient_class: string | null;
  synonyms_json: string[];
  created_at: string;
  updated_at: string;
}

export interface MedicationCatalog {
  id: string;
  brand_name: string;
  generic_name: string | null;
  normalized_brand_name: string;
  dosage_form: string | null;
  strength_text: string | null;
  manufacturer_name: string | null;
  source_name: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicationCatalogIngredient {
  id: string;
  medication_id: string;
  ingredient_id: string;
  strength_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type InteractionSeverityLevel = 'low' | 'medium' | 'high' | 'severe';
export type InteractingType = 'ingredient' | 'drug' | 'condition' | 'population';

export interface MedicationInteractionRule {
  id: string;
  ingredient_id: string;
  interacting_name: string;
  interacting_type: InteractingType;
  severity: InteractionSeverityLevel;
  effect_text: string;
  guidance_text: string | null;
  source_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ContraindicationType = 'condition' | 'allergy' | 'age' | 'pregnancy' | 'lactation' | 'organ_function';
export type ContraindicationSeverity = 'low' | 'medium' | 'high' | 'severe';

export interface MedicationContraindicationRule {
  id: string;
  ingredient_id: string;
  contraindication_name: string;
  contraindication_type: ContraindicationType;
  severity: ContraindicationSeverity;
  guidance_text: string | null;
  source_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PreparationSessionStatus =
  | 'draft'
  | 'processing'
  | 'ready_for_review'
  | 'published'
  | 'failed';

export type PreparationPageStatus =
  | 'uploaded'
  | 'processing'
  | 'extracted'
  | 'failed';

export interface LeafletPreparationSession {
  id: string;
  created_by: string;
  status: PreparationSessionStatus;
  source_name: string | null;
  brand_name: string | null;
  generic_name: string | null;
  dosage_form: string | null;
  manufacturer_name: string | null;
  notes: string | null;
  confidence: number | null;
  warnings_json: string[];
  draft_json: Record<string, unknown>;
  published_medication_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeafletPreparationPage {
  id: string;
  session_id: string;
  page_index: number;
  storage_path: string;
  status: PreparationPageStatus;
  ocr_text: string | null;
  extraction_json: Record<string, unknown>;
  warnings_json: string[];
  error_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeafletPreparationSessionDetail extends LeafletPreparationSession {
  creator: Pick<Profile, 'id' | 'full_name' | 'role'> | null;
  pages: LeafletPreparationPage[];
}

// Extended types for joined data
export interface MedicationWithIngredients extends MedicationCatalog {
  ingredients: (MedicationCatalogIngredient & { ingredient: ActiveIngredient })[];
}

export interface EncounterWithPatient extends Encounter {
  patient: Patient;
}

export interface EncounterDetail extends EncounterWithPatient {
  vitals: Vital[];
  scanned_inserts: ScannedInsert[];
  interaction_checks: InteractionCheck[];
  attachments: Attachment[];
}

export interface PatientDetail extends Patient {
  allergies: PatientAllergy[];
  conditions: PatientCondition[];
  current_medications: CurrentMedication[];
  encounters: Encounter[];
}
