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
      for (final row in batch.crud) {
        final table = row.table;
        final opData = row.opData!;
        switch (row.op) {
          case UpdateType.put:
            await rest.from(table).upsert(opData);
            break;
          case UpdateType.patch:
            await rest.from(table).update(opData).eq('id', opData['id']);
            break;
          case UpdateType.delete:
            await rest.from(table).delete().eq('id', opData['id']);
            break;
        }
      }
      await batch.complete();
      log.info('Uploaded ${batch.crud.length} local CRUD operation(s)');
    } catch (e) {
      log.severe('Failed to upload local CRUD batch', e);
      await batch.complete();
      rethrow;
    }
  }
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
  });

  final String id;
  final String brandName;
  final String genericName;
  final String strengthText;
  final String dosageForm;
}

class PatientRecordDetail {
  const PatientRecordDetail({
    required this.patient,
    required this.allergies,
    required this.conditions,
    required this.currentMedications,
  });

  final PatientOption patient;
  final List<Map<String, Object?>> allergies;
  final List<Map<String, Object?>> conditions;
  final List<Map<String, Object?>> currentMedications;
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
  });

  final String outcome;
  final String summary;
  final List<SafetyReason> reasons;
  final PatientOption patient;
  final MedicationOption medication;
  final List<String> ingredientNames;
}

late final PowerSyncDatabase db;
bool isPowerSyncReady = false;
bool _didShowReferenceSyncToast = false;
StreamSubscription<SyncStatus>? _statusSubscription;
final ValueNotifier<SyncStatus?> syncStatusNotifier = ValueNotifier<SyncStatus?>(null);

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

  if (isPowerSyncReady) {
    return;
  }

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
}

Future<void> _repairLocalSchemaIfNeeded() async {
  await _ensureColumnExists(
    table: 'interaction_checks',
    column: 'updated_at',
    type: 'TEXT',
  );
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
    SELECT id, brand_name, generic_name, strength_text, dosage_form
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
    );
  }).toList(growable: false);
}

Future<PatientRecordDetail> loadPatientRecordDetail(String patientId) async {
  final patients = await loadPatientOptions();
  final patient = patients.firstWhere((item) => item.id == patientId);
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

  return PatientRecordDetail(
    patient: patient,
    allergies: allergies,
    conditions: conditions,
    currentMedications: currentMedications,
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

Future<String> saveEncounterCheck({
  required SafetyAssessment assessment,
  required String clinicianAction,
  required String clinicianNote,
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
        clinicianNote,
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
        clinicianAction,
        clinicianNote,
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
  for (final row in currentMedRows) {
    currentMedicationTerms.add(_normalize('${row['med_name'] ?? ''}'));
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
    } else if (type == 'pregnancy' && patient.pregnancyStatus.toLowerCase().contains('preg')) {
      matched = true;
      detail = guidance.isNotEmpty ? guidance : 'Pregnancy caution applies for this medication.';
    } else if (type == 'lactation' && patient.pregnancyStatus.toLowerCase().contains('lact')) {
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
  );
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
