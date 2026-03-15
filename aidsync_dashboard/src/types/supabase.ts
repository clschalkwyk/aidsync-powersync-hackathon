export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      active_ingredients: {
        Row: {
          id: string
          canonical_name: string
          normalized_name: string
          common_name: string | null
          ingredient_class: string | null
          synonyms_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canonical_name: string
          normalized_name: string
          common_name?: string | null
          ingredient_class?: string | null
          synonyms_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canonical_name?: string
          normalized_name?: string
          common_name?: string | null
          ingredient_class?: string | null
          synonyms_json?: Json
          created_at?: string
          updated_at?: string
        }
      }
      medication_catalog: {
        Row: {
          id: string
          brand_name: string
          generic_name: string | null
          normalized_brand_name: string
          dosage_form: string | null
          strength_text: string | null
          manufacturer_name: string | null
          source_name: string
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_name: string
          generic_name?: string | null
          normalized_brand_name: string
          dosage_form?: string | null
          strength_text?: string | null
          manufacturer_name?: string | null
          source_name?: string
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_name?: string
          generic_name?: string | null
          normalized_brand_name?: string
          dosage_form?: string | null
          strength_text?: string | null
          manufacturer_name?: string | null
          source_name?: string
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      medication_catalog_ingredients: {
        Row: {
          id: string
          medication_id: string
          ingredient_id: string
          strength_text: string | null
          sort_order: number
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          medication_id: string
          ingredient_id: string
          strength_text?: string | null
          sort_order?: number
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          medication_id?: string
          ingredient_id?: string
          strength_text?: string | null
          sort_order?: number
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      medication_interaction_rules: {
        Row: {
          id: string
          ingredient_id: string
          interacting_name: string
          interacting_type: string
          severity: string
          effect_text: string
          guidance_text: string | null
          source_name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          interacting_name: string
          interacting_type?: string
          severity?: string
          effect_text: string
          guidance_text?: string | null
          source_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          interacting_name?: string
          interacting_type?: string
          severity?: string
          effect_text?: string
          guidance_text?: string | null
          source_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      medication_contraindication_rules: {
        Row: {
          id: string
          ingredient_id: string
          contraindication_name: string
          contraindication_type: string
          severity: string
          guidance_text: string | null
          source_name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          contraindication_name: string
          contraindication_type?: string
          severity?: string
          guidance_text?: string | null
          source_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          contraindication_name?: string
          contraindication_type?: string
          severity?: string
          guidance_text?: string | null
          source_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      leaflet_preparation_sessions: {
        Row: {
          id: string
          created_by: string
          status: string
          source_name: string | null
          brand_name: string | null
          generic_name: string | null
          dosage_form: string | null
          manufacturer_name: string | null
          notes: string | null
          confidence: number | null
          warnings_json: Json
          draft_json: Json
          published_medication_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by: string
          status?: string
          source_name?: string | null
          brand_name?: string | null
          generic_name?: string | null
          dosage_form?: string | null
          manufacturer_name?: string | null
          notes?: string | null
          confidence?: number | null
          warnings_json?: Json
          draft_json?: Json
          published_medication_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string
          status?: string
          source_name?: string | null
          brand_name?: string | null
          generic_name?: string | null
          dosage_form?: string | null
          manufacturer_name?: string | null
          notes?: string | null
          confidence?: number | null
          warnings_json?: Json
          draft_json?: Json
          published_medication_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leaflet_preparation_pages: {
        Row: {
          id: string
          session_id: string
          page_index: number
          storage_path: string
          status: string
          ocr_text: string | null
          extraction_json: Json
          warnings_json: Json
          error_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          page_index: number
          storage_path: string
          status?: string
          ocr_text?: string | null
          extraction_json?: Json
          warnings_json?: Json
          error_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          page_index?: number
          storage_path?: string
          status?: string
          ocr_text?: string | null
          extraction_json?: Json
          warnings_json?: Json
          error_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          role: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          external_id: string | null
          full_name: string
          dob: string | null
          sex: string | null
          pregnancy_status: string | null
          location_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_id?: string | null
          full_name: string
          dob?: string | null
          sex?: string | null
          pregnancy_status?: string | null
          location_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_id?: string | null
          full_name?: string
          dob?: string | null
          sex?: string | null
          pregnancy_status?: string | null
          location_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patient_allergies: {
        Row: {
          id: string
          patient_id: string
          allergen_name: string
          allergen_type: string | null
          severity: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          allergen_name: string
          allergen_type?: string | null
          severity?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          allergen_name?: string
          allergen_type?: string | null
          severity?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patient_conditions: {
        Row: {
          id: string
          patient_id: string
          condition_name: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          condition_name: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          condition_name?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      current_medications: {
        Row: {
          id: string
          patient_id: string
          med_name: string
          active_ingredients_json: Json
          dose_text: string | null
          route_text: string | null
          started_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          med_name: string
          active_ingredients_json?: Json
          dose_text?: string | null
          route_text?: string | null
          started_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          med_name?: string
          active_ingredients_json?: Json
          dose_text?: string | null
          route_text?: string | null
          started_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      encounters: {
        Row: {
          id: string
          patient_id: string
          clinician_id: string | null
          encounter_type: string | null
          notes_text: string | null
          ai_summary: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          clinician_id?: string | null
          encounter_type?: string | null
          notes_text?: string | null
          ai_summary?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          clinician_id?: string | null
          encounter_type?: string | null
          notes_text?: string | null
          ai_summary?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      vitals: {
        Row: {
          id: string
          encounter_id: string
          temperature_c: number | null
          pulse_bpm: number | null
          blood_pressure_sys: number | null
          blood_pressure_dia: number | null
          spo2: number | null
          respiration_rate: number | null
          weight_kg: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          encounter_id: string
          temperature_c?: number | null
          pulse_bpm?: number | null
          blood_pressure_sys?: number | null
          blood_pressure_dia?: number | null
          spo2?: number | null
          respiration_rate?: number | null
          weight_kg?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          encounter_id?: string
          temperature_c?: number | null
          pulse_bpm?: number | null
          blood_pressure_sys?: number | null
          blood_pressure_dia?: number | null
          spo2?: number | null
          respiration_rate?: number | null
          weight_kg?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      scanned_inserts: {
        Row: {
          id: string
          encounter_id: string
          image_path: string | null
          raw_ocr_text: string | null
          extracted_json: Json
          extraction_confidence: number | null
          extraction_status: string
          reviewed_by_clinician: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          encounter_id: string
          image_path?: string | null
          raw_ocr_text?: string | null
          extracted_json?: Json
          extraction_confidence?: number | null
          extraction_status?: string
          reviewed_by_clinician?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          encounter_id?: string
          image_path?: string | null
          raw_ocr_text?: string | null
          extracted_json?: Json
          extraction_confidence?: number | null
          extraction_status?: string
          reviewed_by_clinician?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      interaction_checks: {
        Row: {
          id: string
          encounter_id: string
          scanned_insert_id: string | null
          result_status: string
          severity: string
          warnings_json: Json
          clinician_action: string | null
          clinician_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          encounter_id: string
          scanned_insert_id?: string | null
          result_status?: string
          severity?: string
          warnings_json?: Json
          clinician_action?: string | null
          clinician_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          encounter_id?: string
          scanned_insert_id?: string | null
          result_status?: string
          severity?: string
          warnings_json?: Json
          clinician_action?: string | null
          clinician_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          encounter_id: string
          storage_path: string
          mime_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          encounter_id: string
          storage_path: string
          mime_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          encounter_id?: string
          storage_path?: string
          mime_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
