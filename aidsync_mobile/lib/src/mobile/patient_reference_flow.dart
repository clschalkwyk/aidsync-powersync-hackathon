part of '../../main.dart';

// ignore: unused_element
class _OverviewScreen extends StatelessWidget {
  const _OverviewScreen({
    required this.session,
    required this.snapshot,
    required this.busy,
    required this.restoredSession,
    required this.error,
    required this.onRefresh,
    required this.onSignOut,
    required this.onResetPin,
    required this.status,
    required this.onOpenPatients,
    required this.onOpenMeds,
    required this.onOpenCheck,
  });

  final Session session;
  final SyncSnapshot? snapshot;
  final bool busy;
  final bool restoredSession;
  final String? error;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onSignOut;
  final Future<void> Function() onResetPin;
  final SyncStatus? status;
  final VoidCallback onOpenPatients;
  final VoidCallback onOpenMeds;
  final VoidCallback onOpenCheck;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final counts = snapshot?.counts ?? const <String, int>{};
    final patientCount = counts['patients'] ?? 0;
    final medicationCount = counts['medication_catalog'] ?? 0;
    final checkCount = counts['interaction_checks'] ?? 0;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        _HeroPanel(session: session, buildLabel: appBuildLabel),
        const SizedBox(height: 16),
        _StatusBanner(
          status: status,
          restoredSession: restoredSession,
          snapshot: snapshot,
        ),
        if (error != null) ...[
          const SizedBox(height: 16),
          _Panel(
            child: Text(error!, style: TextStyle(color: theme.colorScheme.error)),
          ),
        ],
        const SizedBox(height: 16),
        _Panel(
          background: const Color(0xFFF7FBFC),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Eyebrow('Operational home'),
              const SizedBox(height: 10),
              Text(
                'Offline and ready for care',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                'Use this device as a local treatment workstation. Open the patient queue, review medication references, then run a treatment check without waiting on connectivity.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: onOpenCheck,
                  icon: const Icon(Icons.health_and_safety_outlined),
                  label: const Text('Start treatment check'),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onOpenPatients,
                      icon: const Icon(Icons.folder_shared_outlined),
                      label: const Text('Open patients'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onOpenMeds,
                      icon: const Icon(Icons.medication_outlined),
                      label: const Text('Open medications'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Eyebrow('Readiness'),
              const SizedBox(height: 10),
              Text(
                'What is ready on this device',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 14),
              _ResponsiveMetricWrap(
                items: [
                  _MetricItem(label: 'Patients on device', value: '$patientCount'),
                  _MetricItem(label: 'Medication references', value: '$medicationCount'),
                  _MetricItem(label: 'Checks stored', value: '$checkCount'),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _Panel(
          background: const Color(0xFFF4F8F8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Eyebrow('PowerSync loop'),
              const SizedBox(height: 10),
              Text(
                'Prepare online. Check offline. Sync later.',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 14),
              const _WorkflowStep(
                step: '1',
                title: 'Reference data already on-device',
                body: 'Medication catalog and safety rules prepared online are stored locally through PowerSync.',
              ),
              const SizedBox(height: 12),
              const _WorkflowStep(
                step: '2',
                title: 'Care continues while offline',
                body: 'Patient review, treatment checks, and encounter capture keep working when connectivity drops.',
              ),
              const SizedBox(height: 12),
              const _WorkflowStep(
                step: '3',
                title: 'Results sync back later',
                body: 'Local decisions upload when the device reconnects, without blocking clinical work.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Eyebrow('Recent activity'),
              const SizedBox(height: 12),
              Text(
                'Latest local care decisions',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'Keep this short. The home screen should prove that work is being stored locally and prepared to sync back.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 14),
              if ((snapshot?.interactionChecks ?? const []).isEmpty)
                _InlineMessageCard(
                  icon: Icons.assignment_turned_in_outlined,
                  title: 'No local checks yet',
                  body: 'Run a treatment check and save the clinician action to start building a local encounter history.',
                  tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  foreground: theme.colorScheme.onSurface,
                )
              else
                ...((snapshot?.interactionChecks ?? const [])
                    .take(3)
                    .map(
                      (row) => _RecordRowCard(
                        icon: Icons.assignment_turned_in_outlined,
                        text: '${row['severity'] ?? 'unknown'} • ${row['result_status'] ?? ''}\nAction: ${row['clinician_action'] ?? ''}',
                      ),
                    )),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Device controls', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: busy ? null : onResetPin,
                      icon: const Icon(Icons.key),
                      label: const Text('Reset PIN'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: busy ? null : onSignOut,
                      icon: const Icon(Icons.logout),
                      label: const Text('Sign out'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

enum _PatientQueueFilter {
  recent,
  highRisk,
  offlineReady,
}

class _PatientRecordsScreen extends StatefulWidget {
  const _PatientRecordsScreen({
    required this.onChanged,
  });

  final Future<void> Function() onChanged;

  @override
  State<_PatientRecordsScreen> createState() => _PatientRecordsScreenState();
}

class _PatientRecordsScreenState extends State<_PatientRecordsScreen> {
  List<PatientOption> _patients = const [];
  String _searchQuery = '';
  _PatientQueueFilter _filter = _PatientQueueFilter.recent;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadPatients());
  }

  Future<void> _loadPatients() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final patients = await loadPatientOptions();
      if (!mounted) return;
      setState(() {
        _patients = patients;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load patient records: $e';
      });
    }
  }

  Future<void> _openPatientDetail(String patientId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _PatientDetailScreen(patientId: patientId),
      ),
    );
    await widget.onChanged();
    await _loadPatients();
  }

  Future<void> _openEncounter(String encounterId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _EncounterWorkspaceScreen(
          encounterId: encounterId,
          onChanged: widget.onChanged,
        ),
      ),
    );
    await widget.onChanged();
    await _loadPatients();
  }

  Future<void> _showPatientActions(PatientOption patient) async {
    final activeEncounterId = await findActiveEncounterForPatient(patient.id);
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        final theme = Theme.of(sheetContext);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  patient.fullName,
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  [
                    if (patient.ageYears != null) '${patient.ageYears} years',
                    if (patient.sex.isNotEmpty) _formatLabel(patient.sex),
                    if (patient.locationText.isNotEmpty) patient.locationText,
                  ].join(' • '),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.play_circle_outline),
                  title: const Text('Start encounter'),
                  subtitle: const Text('Open a new local encounter for this patient'),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    final encounterId = await startEncounterDraft(patient.id);
                    if (!mounted) return;
                    await _openEncounter(encounterId);
                  },
                ),
                if (activeEncounterId != null)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.assignment_outlined),
                    title: const Text('Resume draft'),
                    subtitle: const Text('Continue the active local encounter'),
                    onTap: () async {
                      Navigator.of(sheetContext).pop();
                      await _openEncounter(activeEncounterId);
                    },
                  ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.history_outlined),
                  title: const Text('View history'),
                  subtitle: const Text('Open patient detail and recent encounters'),
                  onTap: () async {
                    Navigator.of(sheetContext).pop();
                    await _openPatientDetail(patient.id);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final searchedPatients = _patients.where((patient) {
      final query = _searchQuery.trim().toLowerCase();
      if (query.isEmpty) return true;
      return patient.fullName.toLowerCase().contains(query) ||
          patient.locationText.toLowerCase().contains(query) ||
          (patient.ageYears?.toString().contains(query) ?? false);
    }).toList(growable: false);
    final filteredPatients = switch (_filter) {
      _PatientQueueFilter.highRisk => searchedPatients
          .where(
            (patient) =>
                (patient.ageYears != null && (patient.ageYears! <= 12 || patient.ageYears! >= 65)) ||
                _isPregnancyStatus(patient.pregnancyStatus) ||
                _isLactatingStatus(patient.pregnancyStatus),
          )
          .toList(growable: false),
      _PatientQueueFilter.offlineReady => searchedPatients,
      _PatientQueueFilter.recent => searchedPatients.take(12).toList(growable: false),
    };

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        const _PageHeader(
          eyebrow: 'Patient queue',
          title: 'Local patient entry point',
          body: 'Search the local caseload, then start or resume an encounter from patient context.',
        ),
        const SizedBox(height: 16),
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Patient queue',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              TextField(
                onChanged: (value) => setState(() => _searchQuery = value),
                decoration: const InputDecoration(
                  labelText: 'Search local patients',
                  hintText: 'Name, age, or location',
                  prefixIcon: Icon(Icons.search),
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('Recent'),
                    selected: _filter == _PatientQueueFilter.recent,
                    onSelected: (_) => setState(() => _filter = _PatientQueueFilter.recent),
                  ),
                  ChoiceChip(
                    label: const Text('High risk'),
                    selected: _filter == _PatientQueueFilter.highRisk,
                    onSelected: (_) => setState(() => _filter = _PatientQueueFilter.highRisk),
                  ),
                  ChoiceChip(
                    label: const Text('Offline ready'),
                    selected: _filter == _PatientQueueFilter.offlineReady,
                    onSelected: (_) => setState(() => _filter = _PatientQueueFilter.offlineReady),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(child: CircularProgressIndicator()),
                )
              else ...[
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${filteredPatients.length} available offline',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 52,
                      height: 52,
                      child: OutlinedButton(
                        onPressed: _loadPatients,
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(52, 52),
                          padding: EdgeInsets.zero,
                        ),
                        child: const Icon(Icons.refresh),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () async {
                      final created = await Navigator.of(context).push<bool>(
                        MaterialPageRoute(builder: (_) => const _PatientEntryScreen()),
                      );
                      if (created == true) {
                        await widget.onChanged();
                        await _loadPatients();
                      }
                    },
                    icon: const Icon(Icons.person_add_alt_1),
                    label: const Text('Add patient'),
                  ),
                ),
                const SizedBox(height: 12),
                if (_patients.isEmpty)
                  const Text('No patient records are available locally yet.')
                else if (filteredPatients.isEmpty)
                  const Text('No patients match this search.')
                else
                  ...filteredPatients.map((patient) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(20),
                        onTap: () => _showPatientActions(patient),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.48),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.black.withValues(alpha: 0.04)),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: theme.colorScheme.surfaceContainerHighest,
                                foregroundColor: theme.colorScheme.primary,
                                child: Text(
                                  patient.fullName.isEmpty
                                      ? '?'
                                      : patient.fullName.characters.first.toUpperCase(),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      patient.fullName,
                                      style: theme.textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      [
                                        if (patient.ageYears != null) '${patient.ageYears}y',
                                        if (patient.sex.isNotEmpty) _formatLabel(patient.sex),
                                        if (patient.locationText.isNotEmpty) patient.locationText,
                                      ].join(' • '),
                                      style: theme.textTheme.bodyMedium?.copyWith(
                                        color: theme.colorScheme.onSurfaceVariant,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        _EncounterStatusBadge(
                                          label: _patientRiskSummary(patient),
                                          color: _patientRiskColor(patient),
                                        ),
                                        _EncounterStatusBadge(
                                          label: 'Offline ready',
                                          color: theme.colorScheme.primary,
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(Icons.chevron_right),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
              ],
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
        ],
      ],
    );
  }
}

class _PatientDetailScreen extends StatefulWidget {
  const _PatientDetailScreen({
    required this.patientId,
  });

  final String patientId;

  @override
  State<_PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends State<_PatientDetailScreen> {
  PatientRecordDetail? _detail;
  List<EncounterDraft> _patientEncounters = const [];
  String? _activeEncounterId;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadDetail());
  }

  Future<void> _loadDetail() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<dynamic>([
        loadPatientRecordDetail(widget.patientId),
        loadEncounterDrafts(),
        findActiveEncounterForPatient(widget.patientId),
      ]);
      final detail = results[0] as PatientRecordDetail;
      final allEncounters = results[1] as List<EncounterDraft>;
      final activeEncounterId = results[2] as String?;
      final patientEncounters = allEncounters
          .where((item) => item.patientId == widget.patientId)
          .take(4)
          .toList(growable: false);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _patientEncounters = patientEncounters;
        _activeEncounterId = activeEncounterId;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load patient detail: $e';
      });
    }
  }

  Future<void> _openEncounter(String encounterId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _EncounterWorkspaceScreen(
          encounterId: encounterId,
          onChanged: _loadDetail,
        ),
      ),
    );
    await _loadDetail();
  }

  Future<void> _openSummary(String encounterId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _EncounterHandoffSummaryScreen(encounterId: encounterId),
      ),
    );
    await _loadDetail();
  }

  Future<void> _startEncounter() async {
    try {
      final encounterId = await startEncounterDraft(widget.patientId);
      if (!mounted) return;
      await _openEncounter(encounterId);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Failed to start encounter: $e');
    }
  }

  Future<void> _editPatientContext() async {
    final detail = _detail;
    if (detail == null) return;
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _PatientContextEditorSheet(detail: detail),
    );
    if (changed == true) {
      await _loadDetail();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final detail = _detail;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Patient detail'),
        actions: [
          if (!_loading && _detail != null)
            IconButton(
              onPressed: _editPatientContext,
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Update patient context',
            ),
        ],
      ),
      bottomNavigationBar: detail == null || _loading || _error != null
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(20, 0, 20, 18),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.96),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0E8AA8).withValues(alpha: 0.08),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _startEncounter,
                          icon: const Icon(Icons.play_circle_outline),
                          label: const Text('Start encounter'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _activeEncounterId == null
                              ? null
                              : () => _openEncounter(_activeEncounterId!),
                          icon: const Icon(Icons.assignment_outlined),
                          label: const Text('Resume draft'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
      body: _ScreenBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 148),
          children: [
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _InlineMessageCard(
                icon: Icons.error_outline,
                title: 'Patient detail unavailable',
                body: _error!,
                tone: theme.colorScheme.errorContainer,
                foreground: theme.colorScheme.onErrorContainer,
              )
            else if (detail != null) ...[
              _PatientDetailSummary(
                detail: detail,
              ),
              const SizedBox(height: 16),
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Encounter history'),
                    const SizedBox(height: 10),
                    Text(
                      'Recent encounter preview',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    if (_patientEncounters.isEmpty)
                      _InlineMessageCard(
                        icon: Icons.assignment_outlined,
                        title: 'No local encounters yet',
                        body: 'Start an encounter from this patient record to capture medication checks for the current visit.',
                        tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                        foreground: theme.colorScheme.onSurface,
                      )
                    else
                      ..._patientEncounters.map(
                        (encounter) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _EncounterCard(
                            encounter: encounter,
                            onTap: () => encounter.status == 'completed'
                                ? _openSummary(encounter.id)
                                : _openEncounter(encounter.id),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _RecordSection(
                title: 'Allergies',
                subtitle: 'Known allergy risks and previous reactions to review before treatment.',
                icon: Icons.warning_amber_rounded,
                empty: 'No allergies synced for this patient.',
                rows: detail.allergies,
                rowBuilder: (row) => '${row['allergen_name'] ?? ''}${('${row['severity'] ?? ''}').isEmpty ? '' : ' • ${row['severity']}'}${('${row['notes'] ?? ''}').isEmpty ? '' : '\n${row['notes']}'}',
              ),
              const SizedBox(height: 16),
              _RecordSection(
                title: 'Conditions',
                subtitle: 'Existing conditions that can change medication suitability.',
                icon: Icons.monitor_heart_outlined,
                empty: 'No conditions synced for this patient.',
                rows: detail.conditions,
                rowBuilder: (row) => '${row['condition_name'] ?? ''}${('${row['notes'] ?? ''}').isEmpty ? '' : '\n${row['notes']}'}',
              ),
              const SizedBox(height: 16),
              _RecordSection(
                title: 'Current medications',
                subtitle: 'Active treatment context for interaction and duplicate-ingredient checks.',
                icon: Icons.medication_liquid_outlined,
                empty: 'No current medications synced for this patient.',
                rows: detail.currentMedications,
                rowBuilder: (row) {
                  final ingredients = _safeIngredients(row['active_ingredients_json']);
                  return '${row['med_name'] ?? ''}${ingredients.isEmpty ? '' : '\nIngredients: ${ingredients.join(', ')}'}${('${row['dose_text'] ?? ''}').isEmpty ? '' : '\nDose: ${row['dose_text']}'}';
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PatientContextEditorSheet extends StatefulWidget {
  const _PatientContextEditorSheet({required this.detail});

  final PatientRecordDetail detail;

  @override
  State<_PatientContextEditorSheet> createState() => _PatientContextEditorSheetState();
}

class _PatientContextEditorSheetState extends State<_PatientContextEditorSheet> {
  late String _sex;
  late String _pregnancyStatus;
  bool _saving = false;

  bool get _showPregnancyStatus => _sex == 'female' || _sex == 'other';

  @override
  void initState() {
    super.initState();
    _sex = widget.detail.patient.sex.isEmpty ? 'female' : widget.detail.patient.sex;
    _pregnancyStatus = widget.detail.patient.pregnancyStatus.isEmpty
        ? 'not_pregnant'
        : widget.detail.patient.pregnancyStatus;
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final normalizedPregnancy = _showPregnancyStatus ? _pregnancyStatus : 'unknown';
      await updatePatientRecordContext(
        patientId: widget.detail.patient.id,
        sex: _sex,
        pregnancyStatus: normalizedPregnancy,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      showAppToast('Failed to update patient context: $e');
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Update patient context',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'Adjust the current pregnancy context when the patient status changes. This updates local safety checks immediately.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _sex,
            decoration: const InputDecoration(labelText: 'Sex'),
            items: const [
              DropdownMenuItem(value: 'female', child: Text('Female')),
              DropdownMenuItem(value: 'male', child: Text('Male')),
              DropdownMenuItem(value: 'other', child: Text('Other')),
              DropdownMenuItem(value: 'unknown', child: Text('Unknown')),
            ],
            onChanged: _saving
                ? null
                : (value) {
                    if (value == null) return;
                    setState(() {
                      _sex = value;
                      if (!_showPregnancyStatus) {
                        _pregnancyStatus = 'unknown';
                      } else if (_pregnancyStatus == 'unknown') {
                        _pregnancyStatus = 'not_pregnant';
                      }
                    });
                  },
          ),
          if (_showPregnancyStatus) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _pregnancyStatus == 'unknown' ? 'not_pregnant' : _pregnancyStatus,
              decoration: const InputDecoration(labelText: 'Pregnancy status'),
              items: const [
                DropdownMenuItem(value: 'not_pregnant', child: Text('Not pregnant')),
                DropdownMenuItem(value: 'pregnant', child: Text('Pregnant')),
                DropdownMenuItem(value: 'lactating', child: Text('Lactating')),
                DropdownMenuItem(value: 'unknown', child: Text('Unknown')),
              ],
              onChanged: _saving ? null : (value) => setState(() => _pregnancyStatus = value ?? _pregnancyStatus),
            ),
          ],
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Saving...' : 'Save context'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MedicationCatalogScreen extends StatefulWidget {
  const _MedicationCatalogScreen();

  @override
  State<_MedicationCatalogScreen> createState() => _MedicationCatalogScreenState();
}

class _MedicationCatalogScreenState extends State<_MedicationCatalogScreen> {
  List<MedicationOption> _medications = const [];
  bool _loading = true;
  String _search = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadMedications());
  }

  Future<void> _loadMedications() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final medications = await loadMedicationOptions();
      if (!mounted) return;
      setState(() {
        _medications = medications;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load local medication reference: $e';
      });
    }
  }

  Future<void> _openCustomMedicationEntry() async {
    final medication = await Navigator.of(context).push<MedicationOption>(
      MaterialPageRoute(
        builder: (_) => const _CustomMedicationEntryScreen(),
      ),
    );
    if (!mounted || medication == null) return;
    await _loadMedications();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${medication.brandName} is now available on this device.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final query = _search.trim().toLowerCase();
    final filteredMedications = _medications.where((medication) {
      if (query.isEmpty) return true;
      return medication.brandName.toLowerCase().contains(query) ||
          medication.genericName.toLowerCase().contains(query) ||
          medication.strengthText.toLowerCase().contains(query) ||
          medication.dosageForm.toLowerCase().contains(query);
    }).toList(growable: false);

    return Scaffold(
      appBar: AppBar(title: const Text('Medication reference')),
      body: _ScreenBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          children: [
            const _PageHeader(
              eyebrow: 'Medication reference',
              title: 'Meds on this device',
              body: 'Review the synced medication catalog prepared online. These references stay available offline and feed the treatment check flow.',
            ),
            const SizedBox(height: 16),
            _Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _Eyebrow('Local catalog'),
                  const SizedBox(height: 10),
                  Text(
                    'Search the prepared reference set',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'This list comes from the online preparation workflow and syncs down through PowerSync for offline use.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    onChanged: (value) => setState(() => _search = value),
                    decoration: const InputDecoration(
                      labelText: 'Search meds',
                      hintText: 'Search by brand, generic, strength, or form',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _openCustomMedicationEntry,
                      icon: const Icon(Icons.add_circle_outline),
                      label: const Text('Add custom medicine entry'),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _loading ? 'Loading local catalog...' : '${filteredMedications.length} available offline',
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ),
                      SizedBox(
                        width: 52,
                        height: 52,
                        child: OutlinedButton(
                          onPressed: _loading ? null : _loadMedications,
                          style: OutlinedButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: const Size(52, 52),
                          ),
                          child: const Icon(Icons.refresh),
                        ),
                      ),
                    ],
                  ),
                  if (_loading) ...[
                    const SizedBox(height: 16),
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: CircularProgressIndicator(),
                      ),
                    ),
                  ] else if (_error != null) ...[
                    const SizedBox(height: 16),
                    _InlineMessageCard(
                      icon: Icons.error_outline,
                      title: 'Medication catalog unavailable',
                      body: _error!,
                      tone: theme.colorScheme.errorContainer,
                      foreground: theme.colorScheme.onErrorContainer,
                    ),
                  ] else if (filteredMedications.isEmpty) ...[
                    const SizedBox(height: 16),
                    _InlineMessageCard(
                      icon: Icons.medication_outlined,
                      title: query.isEmpty ? 'No medication references yet' : 'No matching medication found',
                      body: query.isEmpty
                          ? 'Publish medication references from the dashboard, or add a custom medicine entry to continue locally.'
                          : 'Try a different brand, generic name, strength, or dosage form, or add a custom entry.',
                      tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                      foreground: theme.colorScheme.onSurface,
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _openCustomMedicationEntry,
                        icon: const Icon(Icons.add_circle_outline),
                        label: const Text('Create custom medicine'),
                      ),
                    ),
                  ] else ...[
                    const SizedBox(height: 16),
                    ...filteredMedications.map((medication) {
                      final subtitle = [
                        medication.genericName,
                        medication.strengthText,
                        medication.dosageForm,
                      ].where((item) => item.isNotEmpty).join(' • ');

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(22),
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => _MedicationReferenceScreen(
                                  medicationId: medication.id,
                                ),
                              ),
                            );
                          },
                          child: Ink(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(22),
                              border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.primary.withValues(alpha: 0.10),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Icon(
                                    Icons.medication_outlined,
                                    color: theme.colorScheme.primary,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        medication.brandName,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                                      ),
                                      if (subtitle.isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          subtitle,
                                          maxLines: 3,
                                          overflow: TextOverflow.ellipsis,
                                          style: theme.textTheme.bodyMedium?.copyWith(
                                            color: theme.colorScheme.onSurfaceVariant,
                                            height: 1.4,
                                          ),
                                        ),
                                      ],
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Icon(
                                            Icons.offline_pin_outlined,
                                            size: 14,
                                            color: theme.colorScheme.onSurfaceVariant,
                                          ),
                                          const SizedBox(width: 4),
                                          Expanded(
                                            child: Text(
                                              _medicationAvailabilityLabel(medication),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: theme.textTheme.bodySmall?.copyWith(
                                                color: theme.colorScheme.onSurfaceVariant,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MedicationReferenceScreen extends StatefulWidget {
  const _MedicationReferenceScreen({
    required this.medicationId,
  });

  final String medicationId;

  @override
  State<_MedicationReferenceScreen> createState() => _MedicationReferenceScreenState();
}

class _MedicationReferenceScreenState extends State<_MedicationReferenceScreen> {
  MedicationReferenceDetail? _detail;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadDetail());
  }

  Future<void> _loadDetail() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final detail = await loadMedicationReferenceDetail(widget.medicationId);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load medication detail: $e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final detail = _detail;

    return Scaffold(
      appBar: AppBar(title: const Text('Medication reference')),
      body: _ScreenBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
          children: [
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _InlineMessageCard(
                icon: Icons.error_outline,
                title: 'Medication detail unavailable',
                body: _error!,
                tone: theme.colorScheme.errorContainer,
                foreground: theme.colorScheme.onErrorContainer,
              )
            else if (detail != null) ...[
              _MedicationReferenceSummary(
                detail: detail,
              ),
              const SizedBox(height: 16),
              _RecordSection(
                title: 'Active ingredients',
                subtitle: 'These linked ingredients are the local basis for interaction and contraindication checks.',
                icon: Icons.science_outlined,
                empty: 'No active ingredients are linked for this medicine yet.',
                rows: detail.ingredients,
                rowBuilder: (row) {
                  final summary = [
                    '${row['canonical_name'] ?? ''}',
                    if ('${row['strength_text'] ?? ''}'.isNotEmpty) '${row['strength_text']}',
                    if ('${row['is_primary'] ?? ''}' == 'true' || '${row['is_primary'] ?? ''}' == '1') 'Primary',
                  ].where((item) => item.isNotEmpty).join(' • ');
                  final supporting = [
                    '${row['common_name'] ?? ''}',
                    '${row['ingredient_class'] ?? ''}',
                  ].where((item) => item.isNotEmpty).join(' • ');
                  return supporting.isEmpty ? summary : '$summary\n$supporting';
                },
              ),
              const SizedBox(height: 16),
              _RecordSection(
                title: 'Contraindication signals',
                subtitle: 'These local caution topics are linked through the medicine ingredients.',
                icon: Icons.warning_amber_rounded,
                empty: 'No local contraindication rules are linked to this medicine yet.',
                rows: detail.contraindications,
                rowBuilder: (row) {
                  final title = [
                    '${row['contraindication_name'] ?? ''}',
                    '${row['severity'] ?? ''}',
                  ].where((item) => item.isNotEmpty).join(' • ');
                  final supporting = [
                    '${row['ingredient_name'] ?? ''}',
                    '${row['guidance_text'] ?? ''}',
                  ].where((item) => item.isNotEmpty).join('\n');
                  return supporting.isEmpty ? title : '$title\n$supporting';
                },
              ),
              const SizedBox(height: 16),
              _RecordSection(
                title: 'Interaction signals',
                subtitle: 'These local interaction topics are available during treatment checks.',
                icon: Icons.sync_problem_outlined,
                empty: 'No local interaction rules are linked to this medicine yet.',
                rows: detail.interactions,
                rowBuilder: (row) {
                  final title = [
                    '${row['interacting_name'] ?? ''}',
                    '${row['severity'] ?? ''}',
                  ].where((item) => item.isNotEmpty).join(' • ');
                  final supporting = [
                    '${row['ingredient_name'] ?? ''}',
                    '${row['effect_text'] ?? ''}',
                    '${row['guidance_text'] ?? ''}',
                  ].where((item) => item.isNotEmpty).join('\n');
                  return supporting.isEmpty ? title : '$title\n$supporting';
                },
              ),
              if (detail.notes.trim().isNotEmpty) ...[
                const SizedBox(height: 16),
                _Panel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _Eyebrow('Prepared notes'),
                      const SizedBox(height: 10),
                      Text(
                        'Reference summary',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        detail.notes,
                        style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

// ignore: unused_element
class _MedicationCheckScreen extends StatelessWidget {
  const _MedicationCheckScreen({
    required this.onChanged,
    required this.onOpenPatients,
    required this.onOpenMedications,
  });

  final Future<void> Function() onChanged;
  final VoidCallback onOpenPatients;
  final VoidCallback onOpenMedications;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        const _PageHeader(
          eyebrow: 'Decision cockpit',
          title: 'Check medication safety',
          body: 'Bring together patient context, local medication reference data, and rule-based reasoning before treatment.',
        ),
        SizedBox(height: 16),
        _MedicationCheckPanel(
          onEncounterSaved: onChanged,
          onOpenPatients: onOpenPatients,
          onOpenMedications: onOpenMedications,
        ),
      ],
    );
  }
}
