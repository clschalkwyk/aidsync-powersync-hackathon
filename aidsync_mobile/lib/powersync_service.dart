import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:logging/logging.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:powersync/powersync.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_globals.dart';

final log = Logger('aidsync-mobile-service');

class AppConfig {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
  );
  static const powerSyncUrl = String.fromEnvironment('POWERSYNC_URL');

  static bool get hasSyncConfig =>
      supabaseUrl.isNotEmpty &&
      supabasePublishableKey.isNotEmpty &&
      powerSyncUrl.isNotEmpty;

  static List<String> get missing => <String>[
        if (supabaseUrl.isEmpty) 'SUPABASE_URL',
        if (supabasePublishableKey.isEmpty) 'SUPABASE_PUBLISHABLE_KEY',
        if (powerSyncUrl.isEmpty) 'POWERSYNC_URL',
      ];
}

const Schema schema = Schema([
  Table('patients', [
    Column.text('external_id'),
    Column.text('full_name'),
    Column.text('dob'),
    Column.text('sex'),
    Column.text('pregnancy_status'),
    Column.text('location_text'),
    Column.text('created_at'),
    Column.text('updated_at'),
  ]),
  Table('patient_allergies', [
    Column.text('patient_id'),
    Column.text('allergen_name'),
    Column.text('allergen_type'),
    Column.text('severity'),
    Column.text('notes'),
  ]),
  Table('patient_conditions', [
    Column.text('patient_id'),
    Column.text('condition_name'),
    Column.text('notes'),
  ]),
  Table('current_medications', [
    Column.text('patient_id'),
    Column.text('med_name'),
    Column.text('active_ingredients_json'),
    Column.text('dose_text'),
    Column.text('route_text'),
    Column.text('started_at'),
  ]),
  Table('encounters', [
    Column.text('patient_id'),
    Column.text('clinician_id'),
    Column.text('encounter_type'),
    Column.text('notes_text'),
    Column.text('ai_summary'),
    Column.text('supervisor_review_note'),
    Column.text('reviewed_at'),
    Column.text('reviewed_by'),
    Column.text('status'),
    Column.text('created_at'),
    Column.text('updated_at'),
  ]),
  Table('interaction_checks', [
    Column.text('encounter_id'),
    Column.text('scanned_insert_id'),
    Column.text('result_status'),
    Column.text('severity'),
    Column.text('warnings_json'),
    Column.text('clinician_action'),
    Column.text('clinician_note'),
    Column.text('created_at'),
    Column.text('updated_at'),
  ]),
  Table('active_ingredients', [
    Column.text('canonical_name'),
    Column.text('normalized_name'),
    Column.text('common_name'),
    Column.text('ingredient_class'),
    Column.text('synonyms_json'),
    Column.text('created_at'),
    Column.text('updated_at'),
  ]),
  Table('medication_catalog', [
    Column.text('brand_name'),
    Column.text('generic_name'),
    Column.text('normalized_brand_name'),
    Column.text('dosage_form'),
    Column.text('strength_text'),
    Column.text('manufacturer_name'),
    Column.text('source_name'),
    Column.text('notes'),
    Column.text('is_active'),
    Column.text('created_at'),
    Column.text('updated_at'),
  ]),
  Table('medication_catalog_ingredients', [
    Column.text('medication_id'),
    Column.text('ingredient_id'),
    Column.text('strength_text'),
    Column.text('sort_order'),
    Column.text('is_primary'),
    Column.text('created_at'),
    Column.text('updated_at'),
  ]),
  Table('medication_interaction_rules', [
    Column.text('ingredient_id'),
    Column.text('interacting_name'),
    Column.text('interacting_type'),
    Column.text('severity'),
    Column.text('effect_text'),
    Column.text('guidance_text'),
    Column.text('source_name'),
    Column.text('is_active'),
    Column.text('created_at'),
    Column.text('updated_at'),
  ]),
  Table('medication_contraindication_rules', [
    Column.text('ingredient_id'),
    Column.text('contraindication_name'),
    Column.text('contraindication_type'),
    Column.text('severity'),
    Column.text('guidance_text'),
    Column.text('source_name'),
    Column.text('is_active'),
    Column.text('created_at'),
    Column.text('updated_at'),
  ]),
]);

class SupabaseConnector extends PowerSyncBackendConnector {
  SupabaseConnector(this.db);

  final PowerSyncDatabase db;

  @override
  Future<PowerSyncCredentials?> fetchCredentials() async {
    await _ensureFreshSupabaseSession();
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      log.warning('No Supabase session available for PowerSync credentials');
      return null;
    }

    final claims = _decodeJwtClaims(session.accessToken);
    log.info(
      'Supabase access token claims summary: '
      'sub=${claims['sub']} role=${claims['role']} '
      'user_role=${claims['user_role']} app_role=${claims['app_role']} '
      'aud=${claims['aud']}',
    );

    log.info(
      'PowerSync credentials ready for user=${session.user.id} endpoint=${AppConfig.powerSyncUrl}',
    );

    return PowerSyncCredentials(
      endpoint: AppConfig.powerSyncUrl,
      token: session.accessToken,
      userId: session.user.id,
      expiresAt: session.expiresAt == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(session.expiresAt! * 1000),
    );
  }

  @override
  Future<void> uploadData(PowerSyncDatabase db) async {
    final batch = await db.getCrudBatch();
    if (batch == null) {
      return;
    }

    final rest = Supabase.instance.client;

    try {
      final orderedCrud = [...batch.crud]
        ..sort((left, right) {
          final leftPriority = _uploadTablePriority(left.table, left.op);
          final rightPriority = _uploadTablePriority(right.table, right.op);
          return leftPriority.compareTo(rightPriority);
        });

      for (final row in orderedCrud) {
        final table = row.table;
        final opData = _normalizeUploadPayload(table, row.opData);
        switch (row.op) {
          case UpdateType.put:
            await rest.from(table).upsert({
              'id': row.id,
              ...?opData,
            });
            break;
          case UpdateType.patch:
            await rest.from(table).update(opData ?? const {}).eq('id', row.id);
            break;
          case UpdateType.delete:
            await rest.from(table).delete().eq('id', row.id);
            break;
        }
      }
      await batch.complete();
      log.info('Uploaded ${orderedCrud.length} local CRUD operation(s)');
    } catch (e) {
      log.severe('Failed to upload local CRUD batch', e);
      rethrow;
    }
  }
}

int _uploadTablePriority(String table, UpdateType op) {
  if (op == UpdateType.delete) {
    return switch (table) {
      'interaction_checks' => 1,
      'encounters' => 2,
      _ => 10,
    };
  }

  return switch (table) {
    'patients' => 1,
    'encounters' => 2,
    'interaction_checks' => 3,
    _ => 10,
  };
}

Map<String, Object?>? _normalizeUploadPayload(String table, Map<String, Object?>? opData) {
  if (opData == null) return null;
  if (table != 'interaction_checks') return opData;

  return {
    ...opData,
    if (opData.containsKey('scanned_insert_id')) 'scanned_insert_id': null,
    if (opData.containsKey('clinician_action'))
      'clinician_action': _normalizeClinicianAction('${opData['clinician_action'] ?? ''}'),
  };
}

class SyncSnapshot {
  const SyncSnapshot({
    required this.counts,
    required this.medications,
    required this.patients,
    required this.interactionChecks,
    required this.clientId,
    required this.uploadQueueCount,
    required this.uploadQueueSize,
    required this.statusSummary,
    required this.streams,
    required this.updatedAt,
  });

  final Map<String, int> counts;
  final List<Map<String, Object?>> medications;
  final List<Map<String, Object?>> patients;
  final List<Map<String, Object?>> interactionChecks;
  final String clientId;
  final int uploadQueueCount;
  final int uploadQueueSize;
  final String statusSummary;
  final List<String> streams;
  final DateTime updatedAt;
}

class SyncStatusSummary {
  const SyncStatusSummary({
    required this.connected,
    required this.lastSyncedAt,
    required this.pendingEncounterCount,
    required this.pendingMedicationChecksCount,
    required this.uploadQueueCount,
    required this.statusSummary,
    required this.error,
  });

  final bool connected;
  final DateTime? lastSyncedAt;
  final int pendingEncounterCount;
  final int pendingMedicationChecksCount;
  final int uploadQueueCount;
  final String statusSummary;
  final String? error;
}

class PatientOption {
  const PatientOption({
    required this.id,
    required this.fullName,
    required this.sex,
    required this.pregnancyStatus,
    required this.locationText,
    required this.ageYears,
  });

  final String id;
  final String fullName;
  final String sex;
  final String pregnancyStatus;
  final String locationText;
  final int? ageYears;
}

class MedicationOption {
  const MedicationOption({
    required this.id,
    required this.brandName,
    required this.genericName,
    required this.strengthText,
    required this.dosageForm,
    required this.sourceName,
  });

  final String id;
  final String brandName;
  final String genericName;
  final String strengthText;
  final String dosageForm;
  final String sourceName;
}

class MedicationReferenceDetail {
  const MedicationReferenceDetail({
    required this.medication,
    required this.manufacturerName,
    required this.sourceName,
    required this.notes,
    required this.ingredients,
    required this.contraindications,
    required this.interactions,
  });

  final MedicationOption medication;
  final String manufacturerName;
  final String sourceName;
  final String notes;
  final List<Map<String, Object?>> ingredients;
  final List<Map<String, Object?>> contraindications;
  final List<Map<String, Object?>> interactions;
}

class PatientRecordDetail {
  const PatientRecordDetail({
    required this.patient,
    required this.allergies,
    required this.conditions,
    required this.currentMedications,
    required this.bloodPressureTrend,
  });

  final PatientOption patient;
  final List<Map<String, Object?>> allergies;
  final List<Map<String, Object?>> conditions;
  final List<Map<String, Object?>> currentMedications;
  final List<BloodPressureReading> bloodPressureTrend;
}

class BloodPressureReading {
  const BloodPressureReading({
    required this.label,
    required this.value,
    required this.systolic,
    required this.diastolic,
    required this.recordedAt,
  });

  final String label;
  final String value;
  final int systolic;
  final int diastolic;
  final DateTime recordedAt;
}

class SafetyReason {
  const SafetyReason({
    required this.severity,
    required this.title,
    required this.detail,
  });

  final String severity;
  final String title;
  final String detail;
}

class SafetyAssessment {
  const SafetyAssessment({
    required this.outcome,
    required this.summary,
    required this.reasons,
    required this.patient,
    required this.medication,
    required this.ingredientNames,
    required this.allergyNames,
    required this.conditionNames,
    required this.currentMedicationNames,
  });

  final String outcome;
  final String summary;
  final List<SafetyReason> reasons;
  final PatientOption patient;
  final MedicationOption medication;
  final List<String> ingredientNames;
  final List<String> allergyNames;
  final List<String> conditionNames;
  final List<String> currentMedicationNames;
}

class EncounterDraft {
  const EncounterDraft({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.status,
    required this.presentingComplaint,
    required this.clinicianNote,
    required this.medicationChecksCount,
    required this.highestSeverity,
    required this.supervisorReviewNote,
    required this.reviewedAt,
    required this.pendingSync,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String patientId;
  final String patientName;
  final String status;
  final String? presentingComplaint;
  final String? clinicianNote;
  final int medicationChecksCount;
  final String? highestSeverity;
  final String? supervisorReviewNote;
  final DateTime? reviewedAt;
  final bool pendingSync;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class MedicationCheckDraft {
  const MedicationCheckDraft({
    required this.id,
    required this.encounterId,
    required this.medicationId,
    required this.medicationName,
    required this.strengthText,
    required this.dosageForm,
    required this.outcome,
    required this.reasons,
    required this.action,
    required this.note,
    required this.pendingSync,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String encounterId;
  final String medicationId;
  final String medicationName;
  final String strengthText;
  final String dosageForm;
  final String outcome;
  final List<SafetyReason> reasons;
  final String? action;
  final String? note;
  final bool pendingSync;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class EncounterWorkspaceData {
  const EncounterWorkspaceData({
    required this.encounter,
    required this.patientDetail,
    required this.voiceNoteTranscript,
    required this.vitals,
    required this.medicationChecks,
  });

  final EncounterDraft encounter;
  final PatientRecordDetail patientDetail;
  final String voiceNoteTranscript;
  final Map<String, String> vitals;
  final List<MedicationCheckDraft> medicationChecks;
}

late final PowerSyncDatabase db;
bool isPowerSyncReady = false;
bool _didShowReferenceSyncToast = false;
StreamSubscription<SyncStatus>? _statusSubscription;
final ValueNotifier<SyncStatus?> syncStatusNotifier = ValueNotifier<SyncStatus?>(null);
Future<void>? _powerSyncInitFuture;

Future<void> initializeSupabaseIfConfigured() async {
  if (!AppConfig.hasSyncConfig) {
    return;
  }

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabasePublishableKey,
  );
  final session = Supabase.instance.client.auth.currentSession;
  log.info('Supabase initialized. Existing session=${session != null}');
}

Future<void> initPowerSync() async {
  if (!AppConfig.hasSyncConfig) {
    throw StateError(
      'Missing required --dart-define values: ${AppConfig.missing.join(', ')}',
    );
  }

  if (_powerSyncInitFuture != null) {
    await _powerSyncInitFuture;
    return;
  }

  if (isPowerSyncReady) {
    return;
  }

  _powerSyncInitFuture = () async {
    await _ensureFreshSupabaseSession();

    final dir = await getApplicationSupportDirectory();
    final path = join(dir.path, 'aidsync_mobile.db');
    log.info('Initializing PowerSync local database at $path');

    db = PowerSyncDatabase(schema: schema, path: path);
    await db.initialize();
    await _repairLocalSchemaIfNeeded();
    final clientId = await db.getClientId();
    log.info('PowerSync local database initialized with clientId=$clientId');

    _statusSubscription?.cancel();
    _statusSubscription = db.statusStream.listen((status) async {
      syncStatusNotifier.value = status;
      log.info('PowerSync status: ${_formatStatus(status)}');
      final streams = status.syncStreams?.toList() ?? const [];
      for (final stream in streams) {
        log.info(
          'PowerSync stream ${stream.subscription.name} '
          'params=${stream.subscription.parameters} '
          'progress=${stream.progress}',
        );
      }

      if (status.connected || status.lastSyncedAt != null || status.anyError != null) {
        final snapshot = await loadSyncSnapshot();
        log.info(
          'Local snapshot after status change: counts=${snapshot.counts} '
          'uploadQueue=${snapshot.uploadQueueCount}/${snapshot.uploadQueueSize}B '
          'streams=${snapshot.streams}',
        );
      }
    });

    log.info('Connecting PowerSync to backend');
    db.connect(connector: SupabaseConnector(db));
    log.info('PowerSync connect() invoked. Initial status: ${_formatStatus(db.currentStatus)}');
    isPowerSyncReady = true;
    showAppToast('PowerSync sync starting...');
    unawaited(_showReferenceSyncToastWhenReady());
  }();

  try {
    await _powerSyncInitFuture;
  } finally {
    _powerSyncInitFuture = null;
  }
}

Future<void> retryPowerSyncConnection() async {
  if (!isPowerSyncReady) {
    return;
  }

  await _ensureFreshSupabaseSession();
  await db.disconnect();
  await db.connect(connector: SupabaseConnector(db));
  log.info('PowerSync reconnect requested manually');
}

Future<void> _ensureFreshSupabaseSession() async {
  final auth = Supabase.instance.client.auth;
  final session = auth.currentSession;
  if (session == null) {
    return;
  }

  final expiresAtSeconds = session.expiresAt;
  if (expiresAtSeconds == null) {
    return;
  }

  final expiresAt = DateTime.fromMillisecondsSinceEpoch(
    expiresAtSeconds * 1000,
    isUtc: true,
  );
  final remaining = expiresAt.difference(DateTime.now().toUtc());
  if (remaining > const Duration(minutes: 2)) {
    return;
  }

  log.info('Refreshing Supabase session before PowerSync connection');
  await auth.refreshSession();
}

Future<void> _repairLocalSchemaIfNeeded() async {
  await _ensureColumnExists(
    table: 'encounters',
    column: 'supervisor_review_note',
    type: 'TEXT',
  );
  await _ensureColumnExists(
    table: 'encounters',
    column: 'reviewed_at',
    type: 'TEXT',
  );
  await _ensureColumnExists(
    table: 'encounters',
    column: 'reviewed_by',
    type: 'TEXT',
  );
  await _ensureColumnExists(
    table: 'interaction_checks',
    column: 'updated_at',
    type: 'TEXT',
  );
  await _clearInvalidScannedInsertReferences();
  await _normalizeLocalInteractionCheckActions();
}

Future<void> _ensureColumnExists({
  required String table,
  required String column,
  required String type,
}) async {
  final pragmaRows = await db.getAll('PRAGMA table_info($table)');
  final existingColumns = pragmaRows
      .map((row) => row['name']?.toString())
      .whereType<String>()
      .toSet();

  if (existingColumns.contains(column)) {
    return;
  }

  log.warning('Repairing local schema: adding missing column $table.$column');
  await db.execute('ALTER TABLE $table ADD COLUMN $column $type');
}

Future<void> _normalizeLocalInteractionCheckActions() async {
  final staleRows = await db.getAll('''
    SELECT COUNT(*) AS count
    FROM interaction_checks
    WHERE clinician_action IN ('proceed', 'hold', 'manual_review')
  ''');
  final staleCount = int.tryParse('${staleRows.firstOrNull?['count'] ?? 0}') ?? 0;
  if (staleCount == 0) {
    return;
  }

  log.warning(
    'Repairing local schema: normalizing $staleCount stale interaction check action value(s)',
  );
  await db.execute('''
    UPDATE interaction_checks
    SET clinician_action = CASE LOWER(COALESCE(clinician_action, ''))
      WHEN 'proceed' THEN 'accept'
      WHEN 'hold' THEN 'accept'
      WHEN 'manual_review' THEN 'note'
      ELSE clinician_action
    END
    WHERE clinician_action IN ('proceed', 'hold', 'manual_review')
  ''');
}

Future<void> _clearInvalidScannedInsertReferences() async {
  final staleRows = await db.getAll('''
    SELECT COUNT(*) AS count
    FROM interaction_checks
    WHERE scanned_insert_id IS NOT NULL AND TRIM(scanned_insert_id) <> ''
  ''');
  final staleCount = int.tryParse('${staleRows.firstOrNull?['count'] ?? 0}') ?? 0;
  if (staleCount == 0) {
    return;
  }

  log.warning(
    'Repairing local schema: clearing $staleCount invalid scanned_insert_id value(s)',
  );
  await db.execute('''
    UPDATE interaction_checks
    SET scanned_insert_id = NULL
    WHERE scanned_insert_id IS NOT NULL AND TRIM(scanned_insert_id) <> ''
  ''');
}

Future<void> _showReferenceSyncToastWhenReady() async {
  for (final wait in const [3, 8, 15]) {
    await Future<void>.delayed(Duration(seconds: wait));
    if (!isPowerSyncReady) {
      return;
    }
    final snapshot = await loadSyncSnapshot();
    final hasReferenceData =
        (snapshot.counts['active_ingredients'] ?? 0) > 0 ||
        (snapshot.counts['medication_catalog'] ?? 0) > 0;
    if (hasReferenceData && !_didShowReferenceSyncToast) {
      _didShowReferenceSyncToast = true;
      showAppToast('PowerSync reference data synced');
      return;
    }
  }
}

Future<SyncSnapshot> loadSyncSnapshot() async {
  if (!isPowerSyncReady) {
    throw StateError('PowerSync is not initialized');
  }

  Future<int> count(String table) async {
    final rows = await db.getAll('SELECT COUNT(*) AS count FROM $table');
    final row = rows.firstOrNull;
    return row == null ? 0 : int.tryParse('${row['count']}') ?? 0;
  }

  final counts = <String, int>{
    'patients': await count('patients'),
    'encounters': await count('encounters'),
    'interaction_checks': await count('interaction_checks'),
    'active_ingredients': await count('active_ingredients'),
    'medication_catalog': await count('medication_catalog'),
    'medication_catalog_ingredients': await count('medication_catalog_ingredients'),
    'medication_interaction_rules': await count('medication_interaction_rules'),
    'medication_contraindication_rules': await count('medication_contraindication_rules'),
  };

  final medications = await db.getAll('''
    SELECT brand_name, generic_name, dosage_form, strength_text, manufacturer_name
    FROM medication_catalog
    ORDER BY brand_name
    LIMIT 8
  ''');

  final patients = await db.getAll('''
    SELECT full_name, sex, pregnancy_status, location_text
    FROM patients
    ORDER BY full_name
    LIMIT 8
  ''');

  final checks = await db.getAll('''
    SELECT severity, result_status, clinician_action, created_at
    FROM interaction_checks
    ORDER BY created_at DESC
    LIMIT 8
  ''');

  final clientId = await db.getClientId();
  final uploadQueue = await db.getUploadQueueStats(includeSize: true);
  final currentStatus = db.currentStatus;
  final streams = currentStatus.syncStreams
          ?.map((stream) => stream.subscription.name)
          .toList(growable: false) ??
      const [];

  return SyncSnapshot(
    counts: counts,
    medications: medications,
    patients: patients,
    interactionChecks: checks,
    clientId: clientId,
    uploadQueueCount: uploadQueue.count,
    uploadQueueSize: uploadQueue.size ?? 0,
    statusSummary: _formatStatus(currentStatus),
    streams: streams,
    updatedAt: DateTime.now(),
  );
}

Future<SyncStatusSummary> loadSyncStatusSummary() async {
  final snapshot = await loadSyncSnapshot();
  final status = db.currentStatus;
  final lastSyncedAt = status.lastSyncedAt?.toUtc().toIso8601String();
  final activeEncounterRows = await db.getAll('''
    SELECT COUNT(*) AS count
    FROM encounters
    WHERE ? IS NULL OR updated_at > ?
  ''', [lastSyncedAt, lastSyncedAt]);
  final pendingCheckRows = await db.getAll('''
    SELECT COUNT(*) AS count
    FROM interaction_checks
    WHERE ? IS NULL OR updated_at > ?
  ''', [lastSyncedAt, lastSyncedAt]);

  return SyncStatusSummary(
    connected: status.connected,
    lastSyncedAt: status.lastSyncedAt,
    pendingEncounterCount:
        int.tryParse('${activeEncounterRows.firstOrNull?['count'] ?? 0}') ?? 0,
    pendingMedicationChecksCount:
        int.tryParse('${pendingCheckRows.firstOrNull?['count'] ?? 0}') ?? 0,
    uploadQueueCount: snapshot.uploadQueueCount,
    statusSummary: snapshot.statusSummary,
    error: status.anyError?.toString(),
  );
}

Future<List<PatientOption>> loadPatientOptions() async {
  final rows = await db.getAll('''
    SELECT id, full_name, sex, pregnancy_status, location_text, dob
    FROM patients
    ORDER BY full_name
  ''');

  return rows.map((row) {
    final dob = _parseDate('${row['dob'] ?? ''}');
    return PatientOption(
      id: '${row['id']}',
      fullName: '${row['full_name'] ?? 'Unknown'}',
      sex: '${row['sex'] ?? ''}',
      pregnancyStatus: '${row['pregnancy_status'] ?? ''}',
      locationText: '${row['location_text'] ?? ''}',
      ageYears: _calculateAgeYears(dob),
    );
  }).toList(growable: false);
}

Future<List<MedicationOption>> loadMedicationOptions() async {
  final rows = await db.getAll('''
    SELECT id, brand_name, generic_name, strength_text, dosage_form, source_name
    FROM medication_catalog
    WHERE COALESCE(is_active, 'true') IN ('true', '1', 't')
    ORDER BY brand_name
  ''');

  return rows.map((row) {
    return MedicationOption(
      id: '${row['id']}',
      brandName: '${row['brand_name'] ?? 'Unknown'}',
      genericName: '${row['generic_name'] ?? ''}',
      strengthText: '${row['strength_text'] ?? ''}',
      dosageForm: '${row['dosage_form'] ?? ''}',
      sourceName: '${row['source_name'] ?? ''}',
    );
  }).toList(growable: false);
}

Future<MedicationReferenceDetail> loadMedicationReferenceDetail(String medicationId) async {
  final medicationRows = await db.getAll('''
    SELECT id, brand_name, generic_name, strength_text, dosage_form, manufacturer_name, source_name, notes
    FROM medication_catalog
    WHERE id = ?
    LIMIT 1
  ''', [medicationId]);

  final medicationRow = medicationRows.firstOrNull;
  if (medicationRow == null) {
    throw StateError('Medication $medicationId is not available in local SQLite.');
  }

  final medication = MedicationOption(
    id: '${medicationRow['id']}',
    brandName: '${medicationRow['brand_name'] ?? 'Unknown'}',
    genericName: '${medicationRow['generic_name'] ?? ''}',
    strengthText: '${medicationRow['strength_text'] ?? ''}',
    dosageForm: '${medicationRow['dosage_form'] ?? ''}',
    sourceName: '${medicationRow['source_name'] ?? ''}',
  );

  final ingredients = await db.getAll('''
    SELECT ai.canonical_name, ai.common_name, ai.ingredient_class, mci.strength_text, mci.is_primary
    FROM medication_catalog_ingredients mci
    JOIN active_ingredients ai ON ai.id = mci.ingredient_id
    WHERE mci.medication_id = ?
    ORDER BY CAST(COALESCE(mci.sort_order, '0') AS INTEGER), ai.canonical_name
  ''', [medicationId]);

  final contraindications = await db.getAll('''
    SELECT DISTINCT mcr.contraindication_name, mcr.severity, mcr.guidance_text, ai.canonical_name AS ingredient_name
    FROM medication_catalog_ingredients mci
    JOIN medication_contraindication_rules mcr ON mcr.ingredient_id = mci.ingredient_id
    JOIN active_ingredients ai ON ai.id = mci.ingredient_id
    WHERE mci.medication_id = ?
      AND COALESCE(mcr.is_active, 'true') IN ('true', '1', 't')
    ORDER BY mcr.severity DESC, mcr.contraindication_name
  ''', [medicationId]);

  final interactions = await db.getAll('''
    SELECT DISTINCT mir.interacting_name, mir.severity, mir.effect_text, mir.guidance_text, ai.canonical_name AS ingredient_name
    FROM medication_catalog_ingredients mci
    JOIN medication_interaction_rules mir ON mir.ingredient_id = mci.ingredient_id
    JOIN active_ingredients ai ON ai.id = mci.ingredient_id
    WHERE mci.medication_id = ?
      AND COALESCE(mir.is_active, 'true') IN ('true', '1', 't')
    ORDER BY mir.severity DESC, mir.interacting_name
  ''', [medicationId]);

  return MedicationReferenceDetail(
    medication: medication,
    manufacturerName: '${medicationRow['manufacturer_name'] ?? ''}',
    sourceName: '${medicationRow['source_name'] ?? ''}',
    notes: '${medicationRow['notes'] ?? ''}',
    ingredients: ingredients,
    contraindications: contraindications,
    interactions: interactions,
  );
}

Future<MedicationOption> createCustomMedicationOption({
  required String brandName,
  String genericName = '',
  String strengthText = '',
  String dosageForm = '',
}) async {
  final medicationId = _newUuid();
  final timestamp = DateTime.now().toUtc().toIso8601String();

  await db.writeTransaction((tx) async {
    await tx.execute(
      '''
        INSERT INTO medication_catalog(
          id, brand_name, generic_name, normalized_brand_name, dosage_form, strength_text,
          manufacturer_name, source_name, notes, is_active, created_at, updated_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ''',
      [
        medicationId,
        brandName.trim(),
        _orNull(genericName),
        _normalize(brandName),
        _orNull(dosageForm),
        _orNull(strengthText),
        null,
        'custom_mobile_entry',
        'Custom medicine entry created on device. Ingredient mapping is not available locally yet.',
        'true',
        timestamp,
        timestamp,
      ],
    );
  });

  return MedicationOption(
    id: medicationId,
    brandName: brandName.trim(),
    genericName: genericName.trim(),
    strengthText: strengthText.trim(),
    dosageForm: dosageForm.trim(),
    sourceName: 'custom_mobile_entry',
  );
}

Future<PatientRecordDetail> loadPatientRecordDetail(String patientId) async {
  final patientRows = await db.getAll('''
    SELECT id, full_name, sex, pregnancy_status, location_text, dob
    FROM patients
    WHERE id = ?
    LIMIT 1
  ''', [patientId]);
  final patientRow = patientRows.firstOrNull;
  if (patientRow == null) {
    throw StateError('Patient $patientId is not available in local SQLite.');
  }

  final dob = _parseDate('${patientRow['dob'] ?? ''}');
  final patient = PatientOption(
    id: '${patientRow['id']}',
    fullName: '${patientRow['full_name'] ?? 'Unknown'}',
    sex: '${patientRow['sex'] ?? ''}',
    pregnancyStatus: '${patientRow['pregnancy_status'] ?? ''}',
    locationText: '${patientRow['location_text'] ?? ''}',
    ageYears: _calculateAgeYears(dob),
  );
  final allergies = await db.getAll('''
    SELECT allergen_name, allergen_type, severity, notes
    FROM patient_allergies
    WHERE patient_id = ?
    ORDER BY allergen_name
  ''', [patientId]);
  final conditions = await db.getAll('''
    SELECT condition_name, notes
    FROM patient_conditions
    WHERE patient_id = ?
    ORDER BY condition_name
  ''', [patientId]);
  final currentMedications = await db.getAll('''
    SELECT med_name, active_ingredients_json, dose_text, route_text, started_at
    FROM current_medications
    WHERE patient_id = ?
    ORDER BY med_name
  ''', [patientId]);
  final encounterRows = await db.getAll('''
    SELECT notes_text, created_at
    FROM encounters
    WHERE patient_id = ?
    ORDER BY created_at DESC
    LIMIT 8
  ''', [patientId]);
  final bloodPressureTrend = encounterRows
      .map((row) {
        final context = _decodeEncounterContext('${row['notes_text'] ?? ''}');
        final raw = (context.vitals['Blood pressure'] ?? '').trim();
        if (raw.isEmpty) return null;
        final parsed = _parseBloodPressureValue(raw);
        if (parsed == null) return null;
        final recordedAt = _parseDateTime('${row['created_at'] ?? ''}');
        if (recordedAt == null) return null;
        return BloodPressureReading(
          label: _formatBloodPressureLabel(recordedAt),
          value: '${parsed.$1}/${parsed.$2}',
          systolic: parsed.$1,
          diastolic: parsed.$2,
          recordedAt: recordedAt,
        );
      })
      .whereType<BloodPressureReading>()
      .take(4)
      .toList(growable: false);

  return PatientRecordDetail(
    patient: patient,
    allergies: allergies,
    conditions: conditions,
    currentMedications: currentMedications,
    bloodPressureTrend: bloodPressureTrend,
  );
}

Future<String> createPatientRecord({
  required String fullName,
  String? dob,
  String? sex,
  String? pregnancyStatus,
  String? locationText,
}) async {
  final patientId = _newUuid();
  final timestamp = DateTime.now().toUtc().toIso8601String();
  await db.writeTransaction((tx) async {
    await tx.execute(
      '''
        INSERT INTO patients(
          id, full_name, dob, sex, pregnancy_status, location_text, created_at, updated_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)
      ''',
      [
        patientId,
        fullName,
        _orNull(dob),
        _orNull(sex),
        _orNull(pregnancyStatus),
        _orNull(locationText),
        timestamp,
        timestamp,
      ],
    );
  });
  return patientId;
}

Future<String> startEncounterDraft(String patientId) async {
  final existingEncounterId = await findActiveEncounterForPatient(patientId);
  if (existingEncounterId != null) {
    return existingEncounterId;
  }

  final encounterId = _newUuid();
  final timestamp = DateTime.now().toUtc().toIso8601String();
  final currentUserId = Supabase.instance.client.auth.currentUser?.id;
  await db.writeTransaction((tx) async {
    await tx.execute(
      '''
        INSERT INTO encounters(
          id, patient_id, clinician_id, encounter_type, notes_text, ai_summary, status, created_at, updated_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
      ''',
      [
        encounterId,
        patientId,
        currentUserId,
        'visit',
        _encodeEncounterContext(
          presentingComplaint: '',
          clinicianNote: '',
          voiceNoteTranscript: '',
          vitals: const {},
        ),
        null,
        'draft',
        timestamp,
        timestamp,
      ],
    );
  });
  return encounterId;
}

Future<String?> findActiveEncounterForPatient(String patientId) async {
  final rows = await db.getAll('''
    SELECT id
    FROM encounters
    WHERE patient_id = ?
      AND COALESCE(status, 'draft') = 'draft'
    ORDER BY updated_at DESC
    LIMIT 1
  ''', [patientId]);
  return rows.firstOrNull?['id']?.toString();
}

Future<List<EncounterDraft>> loadEncounterDrafts() async {
  final lastSyncedAt = db.currentStatus.lastSyncedAt?.toLocal();
  final rows = await db.getAll('''
    SELECT
      e.id,
      e.patient_id,
      p.full_name AS patient_name,
      e.status,
      e.notes_text,
      e.supervisor_review_note,
      e.reviewed_at,
      e.created_at,
      e.updated_at,
      COUNT(ic.id) AS medication_checks_count,
      MAX(
        CASE ic.severity
          WHEN 'red' THEN 3
          WHEN 'yellow' THEN 2
          WHEN 'green' THEN 1
          ELSE 0
        END
      ) AS max_severity_rank
    FROM encounters e
    JOIN patients p ON p.id = e.patient_id
    LEFT JOIN interaction_checks ic ON ic.encounter_id = e.id
    GROUP BY e.id, e.patient_id, p.full_name, e.status, e.notes_text, e.created_at, e.updated_at
    ORDER BY
      CASE COALESCE(e.status, 'draft') WHEN 'draft' THEN 0 ELSE 1 END,
      e.updated_at DESC
  ''');

  return rows.map((row) {
    final context = _decodeEncounterContext('${row['notes_text'] ?? ''}');
    final updatedAt = _parseDateTime('${row['updated_at'] ?? ''}') ?? DateTime.now();
    return EncounterDraft(
      id: '${row['id']}',
      patientId: '${row['patient_id']}',
      patientName: '${row['patient_name'] ?? 'Unknown patient'}',
      status: '${row['status'] ?? 'draft'}',
      presentingComplaint: context.presentingComplaint,
      clinicianNote: context.clinicianNote,
      medicationChecksCount:
          int.tryParse('${row['medication_checks_count'] ?? 0}') ?? 0,
      highestSeverity: _severityFromRank(
        int.tryParse('${row['max_severity_rank'] ?? 0}') ?? 0,
      ),
      supervisorReviewNote:
          '${row['supervisor_review_note'] ?? ''}'.trim().isEmpty ? null : '${row['supervisor_review_note']}',
      reviewedAt: _parseDateTime('${row['reviewed_at'] ?? ''}'),
      pendingSync: _isRecordPendingSync(updatedAt, lastSyncedAt),
      createdAt: _parseDateTime('${row['created_at'] ?? ''}') ?? DateTime.now(),
      updatedAt: updatedAt,
    );
  }).toList(growable: false);
}

Future<EncounterWorkspaceData> loadEncounterWorkspace(String encounterId) async {
  final lastSyncedAt = db.currentStatus.lastSyncedAt?.toLocal();
  final encounterRows = await db.getAll('''
    SELECT e.id, e.patient_id, e.status, e.notes_text, e.supervisor_review_note, e.reviewed_at, e.created_at, e.updated_at, p.full_name AS patient_name
    FROM encounters e
    JOIN patients p ON p.id = e.patient_id
    WHERE e.id = ?
    LIMIT 1
  ''', [encounterId]);
  final encounterRow = encounterRows.firstOrNull;
  if (encounterRow == null) {
    throw StateError('Encounter $encounterId is not available in local SQLite.');
  }

  final patientId = '${encounterRow['patient_id']}';
  final patientDetail = await loadPatientRecordDetail(patientId);
  final context = _decodeEncounterContext('${encounterRow['notes_text'] ?? ''}');

  final checkRows = await db.getAll('''
    SELECT
      ic.id,
      ic.encounter_id,
      ic.scanned_insert_id AS medication_id,
      ic.result_status,
      ic.severity,
      ic.warnings_json,
      ic.clinician_action,
      ic.clinician_note,
      ic.created_at,
      ic.updated_at,
      mc.brand_name,
      mc.strength_text,
      mc.dosage_form
    FROM interaction_checks ic
    LEFT JOIN medication_catalog mc ON mc.id = ic.scanned_insert_id
    WHERE ic.encounter_id = ?
    ORDER BY ic.created_at DESC
  ''', [encounterId]);

  final checks = checkRows.map((row) {
    final updatedAt = _parseDateTime('${row['updated_at'] ?? ''}') ?? DateTime.now();
    return MedicationCheckDraft(
      id: '${row['id']}',
      encounterId: '${row['encounter_id']}',
      medicationId: '${row['medication_id'] ?? ''}',
      medicationName: '${row['brand_name'] ?? 'Medication check'}',
      strengthText: '${row['strength_text'] ?? ''}',
      dosageForm: '${row['dosage_form'] ?? ''}',
      outcome: _outcomeFromStoredCheck(
        severity: '${row['severity'] ?? ''}',
        resultStatus: '${row['result_status'] ?? ''}',
      ),
      reasons: _decodeReasons('${row['warnings_json'] ?? '[]'}'),
      action:
          '${row['clinician_action'] ?? ''}'.isEmpty ? null : '${row['clinician_action']}',
      note: '${row['clinician_note'] ?? ''}'.isEmpty ? null : '${row['clinician_note']}',
      pendingSync: _isRecordPendingSync(updatedAt, lastSyncedAt),
      createdAt: _parseDateTime('${row['created_at'] ?? ''}') ?? DateTime.now(),
      updatedAt: updatedAt,
    );
  }).toList(growable: false);

  final highestSeverity = checks.fold<String?>(null, (current, item) {
    final nextRank = _severityRankForOutcome(item.outcome);
    final currentRank = _severityRankForOutcome(current);
    return nextRank > currentRank ? item.outcome : current;
  });

  final encounterUpdatedAt =
      _parseDateTime('${encounterRow['updated_at'] ?? ''}') ?? DateTime.now();

  return EncounterWorkspaceData(
    encounter: EncounterDraft(
      id: '${encounterRow['id']}',
      patientId: patientId,
      patientName: '${encounterRow['patient_name'] ?? patientDetail.patient.fullName}',
      status: '${encounterRow['status'] ?? 'draft'}',
      presentingComplaint: context.presentingComplaint,
      clinicianNote: context.clinicianNote,
      medicationChecksCount: checks.length,
      highestSeverity: highestSeverity,
      supervisorReviewNote:
          '${encounterRow['supervisor_review_note'] ?? ''}'.trim().isEmpty ? null : '${encounterRow['supervisor_review_note']}',
      reviewedAt: _parseDateTime('${encounterRow['reviewed_at'] ?? ''}'),
      pendingSync: _isRecordPendingSync(encounterUpdatedAt, lastSyncedAt),
      createdAt: _parseDateTime('${encounterRow['created_at'] ?? ''}') ?? DateTime.now(),
      updatedAt: encounterUpdatedAt,
    ),
    patientDetail: patientDetail,
    voiceNoteTranscript: context.voiceNoteTranscript,
    vitals: context.vitals,
    medicationChecks: checks,
  );
}

Future<void> updateEncounterDraftContext({
  required String encounterId,
  required String presentingComplaint,
  required String clinicianNote,
  String voiceNoteTranscript = '',
  Map<String, String> vitals = const {},
}) async {
  final existingRows = await db.getAll('''
    SELECT notes_text
    FROM encounters
    WHERE id = ?
    LIMIT 1
  ''', [encounterId]);
  final existing = existingRows.firstOrNull;
  if (existing == null) {
    throw StateError('Encounter $encounterId is not available in local SQLite.');
  }

  final previous = _decodeEncounterContext('${existing['notes_text'] ?? ''}');
  final timestamp = DateTime.now().toUtc().toIso8601String();
  await db.writeTransaction((tx) async {
    await tx.execute(
      '''
        UPDATE encounters
        SET notes_text = ?, updated_at = ?
        WHERE id = ?
      ''',
      [
        _encodeEncounterContext(
          presentingComplaint: presentingComplaint,
          clinicianNote: clinicianNote,
          voiceNoteTranscript:
              voiceNoteTranscript.isEmpty ? previous.voiceNoteTranscript : voiceNoteTranscript,
          vitals: vitals.isEmpty ? previous.vitals : vitals,
        ),
        timestamp,
        encounterId,
      ],
    );
  });
}

Future<String> saveMedicationCheckToEncounter({
  required String encounterId,
  required SafetyAssessment assessment,
  required String clinicianAction,
  required String note,
}) async {
  final checkId = _newUuid();
  final timestamp = DateTime.now().toUtc().toIso8601String();
  final resultStatus = assessment.outcome == 'safe' ? 'no_match' : 'warning_found';
  final severity = switch (assessment.outcome) {
    'do_not_give' => 'red',
    'use_caution' => 'yellow',
    'manual_review' => 'yellow',
    _ => 'green',
  };
  final warningsJson = jsonEncode(
    assessment.reasons
        .map(
          (reason) => {
            'severity': reason.severity,
            'title': reason.title,
            'detail': reason.detail,
          },
        )
        .toList(growable: false),
  );

  await db.writeTransaction((tx) async {
    await tx.execute(
      '''
        INSERT INTO interaction_checks(
          id, encounter_id, scanned_insert_id, result_status, severity, warnings_json, clinician_action, clinician_note, created_at, updated_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ''',
      [
        checkId,
        encounterId,
        null,
        resultStatus,
        severity,
        warningsJson,
        _normalizeClinicianAction(clinicianAction),
        note.trim(),
        timestamp,
        timestamp,
      ],
    );
    await tx.execute(
      '''
        UPDATE encounters
        SET ai_summary = ?, updated_at = ?
        WHERE id = ?
      ''',
      [assessment.summary, timestamp, encounterId],
    );
  });

  return checkId;
}

Future<MedicationCheckDraft> loadMedicationCheckDetail(String checkId) async {
  final lastSyncedAt = db.currentStatus.lastSyncedAt?.toLocal();
  final rows = await db.getAll('''
    SELECT
      ic.id,
      ic.encounter_id,
      ic.scanned_insert_id AS medication_id,
      ic.result_status,
      ic.severity,
      ic.warnings_json,
      ic.clinician_action,
      ic.clinician_note,
      ic.created_at,
      ic.updated_at,
      mc.brand_name,
      mc.strength_text,
      mc.dosage_form,
      e.status AS encounter_status
    FROM interaction_checks ic
    LEFT JOIN medication_catalog mc ON mc.id = ic.scanned_insert_id
    JOIN encounters e ON e.id = ic.encounter_id
    WHERE ic.id = ?
    LIMIT 1
  ''', [checkId]);
  final row = rows.firstOrNull;
  if (row == null) {
    throw StateError('Medication check $checkId is not available in local SQLite.');
  }

  final updatedAt = _parseDateTime('${row['updated_at'] ?? ''}') ?? DateTime.now();
  return MedicationCheckDraft(
    id: '${row['id']}',
    encounterId: '${row['encounter_id']}',
    medicationId: '${row['medication_id'] ?? ''}',
    medicationName: '${row['brand_name'] ?? 'Medication check'}',
    strengthText: '${row['strength_text'] ?? ''}',
    dosageForm: '${row['dosage_form'] ?? ''}',
    outcome: _outcomeFromStoredCheck(
      severity: '${row['severity'] ?? ''}',
      resultStatus: '${row['result_status'] ?? ''}',
    ),
    reasons: _decodeReasons('${row['warnings_json'] ?? '[]'}'),
    action: '${row['clinician_action'] ?? ''}'.isEmpty ? null : '${row['clinician_action']}',
    note: '${row['clinician_note'] ?? ''}'.isEmpty ? null : '${row['clinician_note']}',
    pendingSync: _isRecordPendingSync(updatedAt, lastSyncedAt),
    createdAt: _parseDateTime('${row['created_at'] ?? ''}') ?? DateTime.now(),
    updatedAt: updatedAt,
  );
}

Future<void> finalizeEncounter(String encounterId) async {
  final timestamp = DateTime.now().toUtc().toIso8601String();
  await db.writeTransaction((tx) async {
    await tx.execute(
      '''
        UPDATE encounters
        SET status = 'completed', updated_at = ?
        WHERE id = ?
      ''',
      [timestamp, encounterId],
    );
  });
}

Future<void> cancelEncounterDraft(String encounterId) async {
  final rows = await db.getAll('''
    SELECT status
    FROM encounters
    WHERE id = ?
    LIMIT 1
  ''', [encounterId]);
  final encounter = rows.firstOrNull;
  if (encounter == null) {
    throw StateError('Encounter $encounterId is not available in local SQLite.');
  }

  final status = '${encounter['status'] ?? 'draft'}';
  if (status == 'completed') {
    throw StateError('Only draft encounters can be cancelled.');
  }

  await db.writeTransaction((tx) async {
    await tx.execute(
      '''
        DELETE FROM interaction_checks
        WHERE encounter_id = ?
      ''',
      [encounterId],
    );
    await tx.execute(
      '''
        DELETE FROM encounters
        WHERE id = ?
      ''',
      [encounterId],
    );
  });
}

Future<String> saveEncounterCheck({
  required SafetyAssessment assessment,
  required String patientContext,
  required String clinicianAction,
  required String clinicianNote,
  String voiceNoteTranscript = '',
  Map<String, String> vitals = const {},
}) async {
  final encounterId = _newUuid();
  final checkId = _newUuid();
  final timestamp = DateTime.now().toUtc().toIso8601String();
  final currentUserId = Supabase.instance.client.auth.currentUser?.id;
  final resultStatus = assessment.outcome == 'safe' ? 'no_match' : 'warning_found';
  final severity = switch (assessment.outcome) {
    'do_not_give' => 'red',
    'use_caution' => 'yellow',
    'manual_review' => 'yellow',
    _ => 'green',
  };
  final warningsJson = jsonEncode(
    assessment.reasons
        .map(
          (reason) => {
            'severity': reason.severity,
            'title': reason.title,
            'detail': reason.detail,
          },
        )
        .toList(growable: false),
  );
  final vitalsLines = vitals.entries
      .map((entry) => MapEntry(entry.key.trim(), entry.value.trim()))
      .where((entry) => entry.key.isNotEmpty && entry.value.isNotEmpty)
      .map((entry) => '${entry.key}: ${entry.value}')
      .toList(growable: false);
  final medicationLine = [
    assessment.medication.brandName,
    assessment.medication.strengthText,
    assessment.medication.dosageForm,
  ].where((item) => item.trim().isNotEmpty).join(' • ');
  final structuredEncounterNote = [
    if (patientContext.trim().isNotEmpty) 'Patient context:\n${patientContext.trim()}',
    'Medication under consideration:\n$medicationLine',
    'Safety result:\n${assessment.summary}',
    if (assessment.reasons.isNotEmpty)
      'Safety reasoning:\n${assessment.reasons.map((reason) => '- ${reason.title}: ${reason.detail}').join('\n')}',
    'Clinician action:\n${clinicianAction.trim()}',
    if (clinicianNote.trim().isNotEmpty) 'Clinician note:\n${clinicianNote.trim()}',
    if (voiceNoteTranscript.trim().isNotEmpty) 'Voice note transcript:\n${voiceNoteTranscript.trim()}',
    if (vitalsLines.isNotEmpty) 'Vitals:\n${vitalsLines.join('\n')}',
  ].join('\n\n');

  await db.writeTransaction((tx) async {
    await tx.execute(
      '''
        INSERT INTO encounters(
          id, patient_id, clinician_id, encounter_type, notes_text, ai_summary, status, created_at, updated_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
      ''',
      [
        encounterId,
        assessment.patient.id,
        currentUserId,
        'medication_check',
        structuredEncounterNote,
        assessment.summary,
        'completed',
        timestamp,
        timestamp,
      ],
    );

    await tx.execute(
      '''
        INSERT INTO interaction_checks(
          id, encounter_id, result_status, severity, warnings_json, clinician_action, clinician_note, created_at, updated_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
      ''',
      [
        checkId,
        encounterId,
        resultStatus,
        severity,
        warningsJson,
        _normalizeClinicianAction(clinicianAction),
        structuredEncounterNote,
        timestamp,
        timestamp,
      ],
    );
  });

  return encounterId;
}

Future<SafetyAssessment> evaluateMedicationSuitability({
  required String patientId,
  required String medicationId,
}) async {
  final patients = await loadPatientOptions();
  final meds = await loadMedicationOptions();
  final patient = patients.firstWhere((item) => item.id == patientId);
  final medication = meds.firstWhere((item) => item.id == medicationId);

  final allergyRows = await db.getAll('''
    SELECT allergen_name, allergen_type, severity, notes
    FROM patient_allergies
    WHERE patient_id = ?
  ''', [patientId]);
  final conditionRows = await db.getAll('''
    SELECT condition_name, notes
    FROM patient_conditions
    WHERE patient_id = ?
  ''', [patientId]);
  final currentMedRows = await db.getAll('''
    SELECT med_name, active_ingredients_json, dose_text, route_text
    FROM current_medications
    WHERE patient_id = ?
  ''', [patientId]);
  final ingredientRows = await db.getAll('''
    SELECT ai.id, ai.canonical_name, ai.normalized_name, ai.common_name, mci.strength_text
    FROM medication_catalog_ingredients mci
    JOIN active_ingredients ai ON ai.id = mci.ingredient_id
    WHERE mci.medication_id = ?
    ORDER BY CAST(COALESCE(mci.sort_order, '0') AS INTEGER), ai.canonical_name
  ''', [medicationId]);

  final ingredientIds = ingredientRows.map((row) => '${row['id']}').toList(growable: false);
  final ingredientNames = ingredientRows
      .map((row) => '${row['canonical_name'] ?? row['common_name'] ?? ''}'.trim())
      .where((value) => value.isNotEmpty)
      .toList(growable: false);

  final contraindicationRows = ingredientIds.isEmpty
      ? const <Map<String, Object?>>[]
      : await db.getAll(
          '''
            SELECT contraindication_name, contraindication_type, severity, guidance_text
            FROM medication_contraindication_rules
            WHERE ingredient_id IN (${List.filled(ingredientIds.length, '?').join(', ')})
              AND COALESCE(is_active, 'true') IN ('true', '1', 't')
          ''',
          ingredientIds,
        );

  final interactionRows = ingredientIds.isEmpty
      ? const <Map<String, Object?>>[]
      : await db.getAll(
          '''
            SELECT interacting_name, interacting_type, severity, effect_text, guidance_text
            FROM medication_interaction_rules
            WHERE ingredient_id IN (${List.filled(ingredientIds.length, '?').join(', ')})
              AND COALESCE(is_active, 'true') IN ('true', '1', 't')
          ''',
          ingredientIds,
        );

  final allergyTerms = allergyRows.expand((row) {
    final names = ['${row['allergen_name'] ?? ''}', '${row['allergen_type'] ?? ''}'];
    return names.map(_normalize).where((value) => value.isNotEmpty);
  }).toSet();
  final conditionTerms = conditionRows
      .map((row) => _normalize('${row['condition_name'] ?? ''}'))
      .where((value) => value.isNotEmpty)
      .toSet();
  final currentMedicationTerms = <String>{};
  final allergyNames = allergyRows
      .map((row) => '${row['allergen_name'] ?? ''}'.trim())
      .where((value) => value.isNotEmpty)
      .toSet()
      .toList(growable: false);
  final conditionNames = conditionRows
      .map((row) => '${row['condition_name'] ?? ''}'.trim())
      .where((value) => value.isNotEmpty)
      .toSet()
      .toList(growable: false);
  final currentMedicationNames = <String>{};
  for (final row in currentMedRows) {
    currentMedicationTerms.add(_normalize('${row['med_name'] ?? ''}'));
    final medName = '${row['med_name'] ?? ''}'.trim();
    if (medName.isNotEmpty) currentMedicationNames.add(medName);
    final ingredients = _decodeStringList(row['active_ingredients_json']);
    currentMedicationTerms.addAll(ingredients.map(_normalize).where((value) => value.isNotEmpty));
  }

  final reasons = <SafetyReason>[];

  for (final row in contraindicationRows) {
    final name = '${row['contraindication_name'] ?? ''}'.trim();
    final normalized = _normalize(name);
    final type = '${row['contraindication_type'] ?? ''}'.trim();
    final severity = _normalizeSeverity('${row['severity'] ?? ''}');
    final guidance = '${row['guidance_text'] ?? ''}'.trim();

    bool matched = false;
    String detail = guidance.isNotEmpty ? guidance : name;

    if (type == 'allergy' && allergyTerms.any((term) => normalized.contains(term) || term.contains(normalized))) {
      matched = true;
      detail = guidance.isNotEmpty ? guidance : 'Patient allergy profile overlaps with $name.';
    } else if ((type == 'condition' || type == 'organ_function') &&
        conditionTerms.any((term) => normalized.contains(term) || term.contains(normalized))) {
      matched = true;
      detail = guidance.isNotEmpty ? guidance : 'Patient conditions match $name.';
    } else if (type == 'pregnancy' && _isPregnancyStatus(patient.pregnancyStatus)) {
      matched = true;
      detail = guidance.isNotEmpty ? guidance : 'Pregnancy caution applies for this medication.';
    } else if (type == 'lactation' && _isLactatingStatus(patient.pregnancyStatus)) {
      matched = true;
      detail = guidance.isNotEmpty ? guidance : 'Lactation caution applies for this medication.';
    } else if (type == 'age' && _matchesAgeRestriction(name, patient.ageYears)) {
      matched = true;
      detail = guidance.isNotEmpty ? guidance : 'Age restriction applies: $name.';
    }

    if (matched) {
      reasons.add(SafetyReason(
        severity: severity,
        title: 'Contraindication: $name',
        detail: detail,
      ));
    }
  }

  for (final row in interactionRows) {
    final name = '${row['interacting_name'] ?? ''}'.trim();
    final normalized = _normalize(name);
    final severity = _normalizeSeverity('${row['severity'] ?? ''}');
    final effect = '${row['effect_text'] ?? ''}'.trim();
    final guidance = '${row['guidance_text'] ?? ''}'.trim();

    final matched = currentMedicationTerms.any(
      (term) => term.isNotEmpty && (normalized.contains(term) || term.contains(normalized)),
    );
    if (matched) {
      reasons.add(SafetyReason(
        severity: severity,
        title: 'Interaction risk: $name',
        detail: [effect, guidance].where((item) => item.isNotEmpty).join(' '),
      ));
    }
  }

  if (reasons.isEmpty && ingredientNames.isEmpty) {
    reasons.add(const SafetyReason(
      severity: 'medium',
      title: 'Manual review recommended',
      detail: 'No ingredient mapping is available locally for this medication yet.',
    ));
  }

  final outcome = _deriveOutcome(reasons);
  final summary = switch (outcome) {
    'do_not_give' => 'Potentially unsafe. Do not give until reviewed.',
    'use_caution' => 'Use caution. Review the matched risks before treatment.',
    'manual_review' => 'Manual review recommended before use.',
    _ => 'No blocking risks found in local reference data.',
  };

  return SafetyAssessment(
    outcome: outcome,
    summary: summary,
    reasons: reasons,
    patient: patient,
    medication: medication,
    ingredientNames: ingredientNames,
    allergyNames: allergyNames,
    conditionNames: conditionNames,
    currentMedicationNames: currentMedicationNames.toList(growable: false),
  );
}

class _EncounterContextState {
  const _EncounterContextState({
    required this.presentingComplaint,
    required this.clinicianNote,
    required this.voiceNoteTranscript,
    required this.vitals,
  });

  final String presentingComplaint;
  final String clinicianNote;
  final String voiceNoteTranscript;
  final Map<String, String> vitals;
}

String _encodeEncounterContext({
  required String presentingComplaint,
  required String clinicianNote,
  required String voiceNoteTranscript,
  required Map<String, String> vitals,
}) {
  final normalizedVitals = <String, String>{};
  for (final entry in vitals.entries) {
    final key = entry.key.trim();
    final value = entry.value.trim();
    if (key.isEmpty || value.isEmpty) {
      continue;
    }
    normalizedVitals[key] = value;
  }

  return jsonEncode({
    'presentingComplaint': presentingComplaint.trim(),
    'clinicianNote': clinicianNote.trim(),
    'voiceNoteTranscript': voiceNoteTranscript.trim(),
    'vitals': normalizedVitals,
  });
}

_EncounterContextState _decodeEncounterContext(String raw) {
  if (raw.trim().isEmpty) {
    return const _EncounterContextState(
      presentingComplaint: '',
      clinicianNote: '',
      voiceNoteTranscript: '',
      vitals: {},
    );
  }

  try {
    final decoded = jsonDecode(raw);
    if (decoded is Map<String, dynamic>) {
      final vitals = <String, String>{};
      final rawVitals = decoded['vitals'];
      if (rawVitals is Map) {
        for (final entry in rawVitals.entries) {
          final key = '${entry.key}'.trim();
          final value = '${entry.value}'.trim();
          if (key.isNotEmpty && value.isNotEmpty) {
            vitals[key] = value;
          }
        }
      }

      return _EncounterContextState(
        presentingComplaint: '${decoded['presentingComplaint'] ?? ''}'.trim(),
        clinicianNote: '${decoded['clinicianNote'] ?? ''}'.trim(),
        voiceNoteTranscript: '${decoded['voiceNoteTranscript'] ?? ''}'.trim(),
        vitals: vitals,
      );
    }
  } catch (_) {
    // Older encounters stored a structured narrative blob in notes_text.
  }

  return _EncounterContextState(
    presentingComplaint: '',
    clinicianNote: raw.trim(),
    voiceNoteTranscript: '',
    vitals: const {},
  );
}

DateTime? _parseDateTime(String raw) {
  if (raw.isEmpty || raw == 'null') {
    return null;
  }
  return DateTime.tryParse(raw)?.toLocal();
}

(int, int)? _parseBloodPressureValue(String raw) {
  final match = RegExp(r'^\s*(\d{2,3})\s*/\s*(\d{2,3})\s*$').firstMatch(raw);
  if (match == null) return null;
  final systolic = int.tryParse(match.group(1)!);
  final diastolic = int.tryParse(match.group(2)!);
  if (systolic == null || diastolic == null) return null;
  return (systolic, diastolic);
}

String _formatBloodPressureLabel(DateTime recordedAt) {
  final now = DateTime.now();
  final localDate = DateTime(recordedAt.year, recordedAt.month, recordedAt.day);
  final today = DateTime(now.year, now.month, now.day);
  final difference = today.difference(localDate).inDays;
  if (difference == 0) return 'Today';
  if (difference == 1) return 'Yesterday';
  return '${recordedAt.day}/${recordedAt.month}';
}

String? _severityFromRank(int rank) {
  return switch (rank) {
    >= 3 => 'red',
    2 => 'yellow',
    1 => 'green',
    _ => null,
  };
}

String _outcomeFromStoredCheck({
  required String severity,
  required String resultStatus,
}) {
  final normalizedSeverity = severity.toLowerCase().trim();
  final normalizedStatus = resultStatus.toLowerCase().trim();

  if (normalizedSeverity == 'red') {
    return 'do_not_give';
  }
  if (normalizedSeverity == 'yellow') {
    return 'use_caution';
  }
  if (normalizedSeverity == 'green' || normalizedStatus == 'no_match') {
    return 'safe';
  }
  return 'manual_review';
}

List<SafetyReason> _decodeReasons(String raw) {
  if (raw.trim().isEmpty) {
    return const [];
  }

  try {
    final decoded = jsonDecode(raw);
    if (decoded is List) {
      return decoded.map((item) {
        if (item is Map) {
          return SafetyReason(
            severity: _normalizeSeverity('${item['severity'] ?? ''}'),
            title: '${item['title'] ?? 'Manual review recommended'}'.trim(),
            detail: '${item['detail'] ?? ''}'.trim(),
          );
        }
        return const SafetyReason(
          severity: 'low',
          title: 'Manual review recommended',
          detail: '',
        );
      }).toList(growable: false);
    }
  } catch (_) {}

  return const [];
}

int _severityRankForOutcome(String? outcome) {
  return switch (outcome) {
    'do_not_give' || 'red' => 3,
    'use_caution' || 'manual_review' || 'yellow' => 2,
    'safe' || 'green' => 1,
    _ => 0,
  };
}

Map<String, Object?> _decodeJwtClaims(String token) {
  try {
    final parts = token.split('.');
    if (parts.length < 2) {
      return const {};
    }
    final normalized = base64Url.normalize(parts[1]);
    final payload = utf8.decode(base64Url.decode(normalized));
    final decoded = jsonDecode(payload);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
  } catch (e) {
    log.warning('Failed to decode JWT claims: $e');
  }
  return const {};
}

List<String> _decodeStringList(Object? raw) {
  if (raw == null) return const [];
  if (raw is List) {
    return raw.map((item) => '$item').toList(growable: false);
  }
  try {
    final decoded = jsonDecode('$raw');
    if (decoded is List) {
      return decoded.map((item) => '$item').toList(growable: false);
    }
  } catch (_) {}
  return const [];
}

DateTime? _parseDate(String raw) {
  if (raw.isEmpty || raw == 'null') return null;
  return DateTime.tryParse(raw);
}

int? _calculateAgeYears(DateTime? dob) {
  if (dob == null) return null;
  final now = DateTime.now();
  var years = now.year - dob.year;
  if (now.month < dob.month || (now.month == dob.month && now.day < dob.day)) {
    years -= 1;
  }
  return years;
}

String _normalize(String raw) => raw.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), ' ').trim();

bool _isPregnancyStatus(String status) => status.trim().toLowerCase() == 'pregnant';

bool _isLactatingStatus(String status) => status.trim().toLowerCase() == 'lactating';

String _normalizeSeverity(String raw) {
  final normalized = _normalize(raw);
  if (normalized.contains('severe') || normalized.contains('red') || normalized.contains('high')) {
    return 'high';
  }
  if (normalized.contains('medium') || normalized.contains('yellow')) {
    return 'medium';
  }
  return 'low';
}

bool _matchesAgeRestriction(String text, int? ageYears) {
  if (ageYears == null) return false;
  final normalized = _normalize(text);
  final underMatch = RegExp(r'under\s+(\d+)').firstMatch(normalized);
  if (underMatch != null) {
    final limit = int.tryParse(underMatch.group(1)!);
    if (limit != null && ageYears < limit) return true;
  }
  final overMatch = RegExp(r'over\s+(\d+)').firstMatch(normalized);
  if (overMatch != null) {
    final limit = int.tryParse(overMatch.group(1)!);
    if (limit != null && ageYears > limit) return true;
  }
  final childMatch = normalized.contains('children') || normalized.contains('pediatric');
  return childMatch && ageYears < 12;
}

String? _orNull(String? value) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? null : trimmed;
}

bool _isRecordPendingSync(DateTime updatedAt, DateTime? lastSyncedAt) {
  if (lastSyncedAt == null) {
    return true;
  }
  return updatedAt.isAfter(lastSyncedAt);
}

String _newUuid() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  String hexByte(int value) => value.toRadixString(16).padLeft(2, '0');
  final hex = bytes.map(hexByte).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

String _deriveOutcome(List<SafetyReason> reasons) {
  if (reasons.isEmpty) return 'safe';
  if (reasons.any((item) => item.severity == 'high')) return 'do_not_give';
  if (reasons.any((item) => item.severity == 'medium')) return 'use_caution';
  return 'manual_review';
}

String _normalizeClinicianAction(String action) {
  final normalized = action.trim().toLowerCase();
  return switch (normalized) {
    'accept' => 'accept',
    'dismiss' => 'dismiss',
    'note' => 'note',
    'proceed' => 'accept',
    'hold' => 'accept',
    'manual_review' => 'note',
    _ => 'note',
  };
}

String _formatStatus(SyncStatus status) {
  final streams =
      status.syncStreams?.map((s) => s.subscription.name).join(',') ?? 'unknown';
  return 'connected=${status.connected} '
      'connecting=${status.connecting} '
      'downloading=${status.downloading} '
      'uploading=${status.uploading} '
      'hasSynced=${status.hasSynced} '
      'lastSyncedAt=${status.lastSyncedAt} '
      'error=${status.anyError} '
      'streams=[$streams]';
}
