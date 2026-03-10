import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type {
  ActiveIngredient,
  EncounterDetail,
  MedicationCatalog,
  MedicationContraindicationRule,
  MedicationInteractionRule,
  MedicationWithIngredients,
  Patient,
  PatientDetail,
  Profile,
} from '@/types/database'

type MedicationInsert = Database['public']['Tables']['medication_catalog']['Insert']
type MedicationUpdate = Database['public']['Tables']['medication_catalog']['Update']
type ActiveIngredientInsert = Database['public']['Tables']['active_ingredients']['Insert']
type ActiveIngredientUpdate = Database['public']['Tables']['active_ingredients']['Update']
type MedicationCatalogIngredientInsert = Database['public']['Tables']['medication_catalog_ingredients']['Insert']
type InteractionRuleInsert = Database['public']['Tables']['medication_interaction_rules']['Insert']
type InteractionRuleUpdate = Database['public']['Tables']['medication_interaction_rules']['Update']
type ContraindicationRuleInsert = Database['public']['Tables']['medication_contraindication_rules']['Insert']
type ContraindicationRuleUpdate = Database['public']['Tables']['medication_contraindication_rules']['Update']

// Auth queries
export async function fetchCurrentProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single()
  
  if (error) throw error
  return data as any
}

// Overview counts
export async function fetchOverviewCounts(): Promise<{
  patients: number
  medications: number
  encounters: number
  pendingChecks: number
}> {
  const [
    { count: patients },
    { count: medications },
    { count: encounters },
    { count: pendingChecks },
  ] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }),
    supabase.from('medication_catalog').select('*', { count: 'exact', head: true }),
    supabase.from('encounters').select('*', { count: 'exact', head: true }),
    supabase.from('interaction_checks').select('*', { count: 'exact', head: true })
      .eq('result_status', 'manual_review_required'),
  ])

  return {
    patients: patients || 0,
    medications: medications || 0,
    encounters: encounters || 0,
    pendingChecks: pendingChecks || 0,
  }
}

export async function fetchOverviewStats() {
  const { data: recentEncounters } = await supabase
    .from('encounters')
    .select('*, patient:patients(full_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: pendingReviews } = await supabase
    .from('interaction_checks')
    .select('*, encounter:encounters(id, patient:patients(full_name))')
    .eq('result_status', 'manual_review_required')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    recentEncounters: (recentEncounters || []) as any[],
    pendingReviews: (pendingReviews || []) as any[],
  }
}

// Medication queries
export async function fetchMedications(): Promise<MedicationCatalog[]> {
  const { data, error } = await supabase
    .from('medication_catalog')
    .select('*')
    .order('brand_name')
  
  if (error) throw error
  return (data || []) as MedicationCatalog[]
}

export async function fetchMedicationById(id: string): Promise<MedicationWithIngredients | null> {
  const { data, error } = await supabase
    .from('medication_catalog')
    .select(`
      *,
      ingredients:medication_catalog_ingredients(
        id,
        medication_id,
        ingredient_id,
        strength_text,
        sort_order,
        is_primary,
        ingredient:active_ingredients(*)
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as any
}

export async function fetchActiveIngredients(): Promise<ActiveIngredient[]> {
  const { data, error } = await supabase
    .from('active_ingredients')
    .select('*')
    .order('canonical_name')
  
  if (error) throw error
  return (data || []) as ActiveIngredient[]
}

export async function fetchInteractionRules(): Promise<MedicationInteractionRule[]> {
  const { data, error } = await supabase
    .from('medication_interaction_rules')
    .select(`
      *,
      ingredient:active_ingredients(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return (data || []) as MedicationInteractionRule[]
}

export async function fetchContraindicationRules(): Promise<MedicationContraindicationRule[]> {
  const { data, error } = await supabase
    .from('medication_contraindication_rules')
    .select(`
      *,
      ingredient:active_ingredients(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return (data || []) as MedicationContraindicationRule[]
}

export async function fetchRulesByIngredientIds(ingredientIds: string[]) {
  if (ingredientIds.length === 0) return { interactions: [], contraindications: [] }

  const [interactions, contraindications] = await Promise.all([
    supabase
      .from('medication_interaction_rules')
      .select('*, ingredient:active_ingredients(*)')
      .in('ingredient_id', ingredientIds),
    supabase
      .from('medication_contraindication_rules')
      .select('*, ingredient:active_ingredients(*)')
      .in('ingredient_id', ingredientIds)
  ])

  return {
    interactions: (interactions.data || []) as MedicationInteractionRule[],
    contraindications: (contraindications.data || []) as MedicationContraindicationRule[]
  }
}

// Patient queries
export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return (data || []) as Patient[]
}

export async function fetchPatientById(id: string): Promise<PatientDetail | null> {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      allergies:patient_allergies(*),
      conditions:patient_conditions(*),
      current_medications:current_medications(*),
      encounters:encounters(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as any
}

// Encounter queries
export async function fetchEncounters(): Promise<any[]> {
  const { data, error } = await supabase
    .from('encounters')
    .select(`
      *,
      patient:patients(*),
      interaction_checks(*)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function fetchEncounterById(id: string): Promise<EncounterDetail | null> {
  const { data, error } = await supabase
    .from('encounters')
    .select(`
      *,
      patient:patients(*),
      vitals:vitals(*),
      scanned_inserts:scanned_inserts(*),
      interaction_checks:interaction_checks(*),
      attachments:attachments(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as any
}

// Write operations
export async function createMedication(medication: MedicationInsert) {
  const { data, error } = await (supabase
    .from('medication_catalog') as any)
    .insert(medication)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateMedication(id: string, medication: MedicationUpdate) {
  const { data, error } = await (supabase
    .from('medication_catalog') as any)
    .update(medication)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeMedication(id: string) {
  const { error } = await supabase
    .from('medication_catalog')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function createActiveIngredient(ingredient: ActiveIngredientInsert) {
  const { data, error } = await (supabase
    .from('active_ingredients') as any)
    .insert(ingredient)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateActiveIngredient(id: string, ingredient: ActiveIngredientUpdate) {
  const { data, error } = await (supabase
    .from('active_ingredients') as any)
    .update(ingredient)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeActiveIngredient(id: string) {
  const { error } = await supabase
    .from('active_ingredients')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function createMedicationCatalogIngredient(item: MedicationCatalogIngredientInsert) {
  const { data, error } = await (supabase
    .from('medication_catalog_ingredients') as any)
    .insert(item)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeMedicationCatalogIngredient(id: string) {
  const { error } = await supabase
    .from('medication_catalog_ingredients')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function createInteractionRule(rule: InteractionRuleInsert) {
  const { data, error } = await (supabase
    .from('medication_interaction_rules') as any)
    .insert(rule)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateInteractionRule(id: string, rule: InteractionRuleUpdate) {
  const { data, error } = await (supabase
    .from('medication_interaction_rules') as any)
    .update(rule)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createContraindicationRule(rule: ContraindicationRuleInsert) {
  const { data, error } = await (supabase
    .from('medication_contraindication_rules') as any)
    .insert(rule)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateContraindicationRule(id: string, rule: ContraindicationRuleUpdate) {
  const { data, error } = await (supabase
    .from('medication_contraindication_rules') as any)
    .update(rule)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeInteractionRule(id: string) {
  const { error } = await supabase
    .from('medication_interaction_rules')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function removeContraindicationRule(id: string) {
  const { error } = await supabase
    .from('medication_contraindication_rules')
    .delete()
    .eq('id', id)

  if (error) throw error
}
