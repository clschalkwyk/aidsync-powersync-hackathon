part of '../../main.dart';

class _EncounterWorkspaceScreen extends StatefulWidget {
  const _EncounterWorkspaceScreen({
    required this.encounterId,
    required this.onChanged,
  });

  final String encounterId;
  final Future<void> Function() onChanged;

  @override
  State<_EncounterWorkspaceScreen> createState() => _EncounterWorkspaceScreenState();
}

class _EncounterWorkspaceScreenState extends State<_EncounterWorkspaceScreen> {
  EncounterWorkspaceData? _workspace;
  bool _loading = true;
  bool _savingContext = false;
  bool _finalizing = false;
  bool _contextExpanded = false;
  String? _error;

  final _complaintController = TextEditingController();
  final _noteController = TextEditingController();
  final _voiceNoteController = TextEditingController();
  final _temperatureController = TextEditingController();
  final _pulseController = TextEditingController();
  final _bloodPressureController = TextEditingController();
  final _respiratoryRateController = TextEditingController();
  final _oxygenSatController = TextEditingController();
  final _weightController = TextEditingController();

  @override
  void initState() {
    super.initState();
    unawaited(_loadWorkspace());
  }

  @override
  void dispose() {
    _complaintController.dispose();
    _noteController.dispose();
    _voiceNoteController.dispose();
    _temperatureController.dispose();
    _pulseController.dispose();
    _bloodPressureController.dispose();
    _respiratoryRateController.dispose();
    _oxygenSatController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  Future<void> _loadWorkspace() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final workspace = await loadEncounterWorkspace(widget.encounterId);
      if (!mounted) return;
      _complaintController.text = workspace.encounter.presentingComplaint ?? '';
      _noteController.text = workspace.encounter.clinicianNote ?? '';
      _voiceNoteController.text = workspace.voiceNoteTranscript;
      _temperatureController.text = workspace.vitals['Temperature'] ?? '';
      _pulseController.text = workspace.vitals['Pulse'] ?? '';
      _bloodPressureController.text = workspace.vitals['Blood pressure'] ?? '';
      _respiratoryRateController.text = workspace.vitals['Respiratory rate'] ?? '';
      _oxygenSatController.text = workspace.vitals['Oxygen saturation'] ?? '';
      _weightController.text = workspace.vitals['Weight'] ?? '';
      setState(() {
        _workspace = workspace;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load encounter workspace: $e';
      });
    }
  }

  Future<bool> _saveContext({bool showToast = true}) async {
    final workspace = _workspace;
    if (workspace == null) return false;
    setState(() => _savingContext = true);
    try {
      await updateEncounterDraftContext(
        encounterId: widget.encounterId,
        presentingComplaint: _complaintController.text.trim(),
        clinicianNote: _noteController.text.trim(),
        voiceNoteTranscript: _voiceNoteController.text.trim(),
        vitals: {
          'Temperature': _temperatureController.text.trim(),
          'Pulse': _pulseController.text.trim(),
          'Blood pressure': _bloodPressureController.text.trim(),
          'Respiratory rate': _respiratoryRateController.text.trim(),
          'Oxygen saturation': _oxygenSatController.text.trim(),
          'Weight': _weightController.text.trim(),
        },
      );
      await widget.onChanged();
      await _loadWorkspace();
      if (!mounted) return false;
      if (showToast) {
        showAppToast('Encounter draft saved on device');
      }
      return true;
    } catch (e) {
      if (!mounted) return false;
      setState(() => _error = 'Failed to save encounter context: $e');
      return false;
    } finally {
      if (mounted) {
        setState(() => _savingContext = false);
      }
    }
  }

  Future<void> _openAddMedicationCheck() async {
    final workspace = _workspace;
    if (workspace == null) return;
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => _AddMedicationCheckScreen(
          encounterId: widget.encounterId,
          patientDetail: workspace.patientDetail,
        ),
      ),
    );
    await widget.onChanged();
    await _loadWorkspace();
  }

  Future<void> _openCheckDetail(String checkId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _MedicationCheckDetailScreen(checkId: checkId),
      ),
    );
    await _loadWorkspace();
  }

  Future<void> _finalize() async {
    if (_workspace == null || _workspace!.medicationChecks.isEmpty) return;
    setState(() => _finalizing = true);
    try {
      final saved = await _saveContext(showToast: false);
      if (!saved) {
        return;
      }
      await finalizeEncounter(widget.encounterId);
      await widget.onChanged();
      if (!mounted) return;
      showAppToast('Encounter finalized locally');
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => _EncounterHandoffSummaryScreen(encounterId: widget.encounterId),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Failed to finalize encounter: $e');
    } finally {
      if (mounted) {
        setState(() => _finalizing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final workspace = _workspace;
    final canFinalize = workspace != null &&
        workspace.encounter.status != 'completed' &&
        !_finalizing &&
        workspace.medicationChecks.isNotEmpty;
    final capturedVitals = <String, String>{
      'Temperature': _temperatureController.text.trim(),
      'Pulse': _pulseController.text.trim(),
      'Blood pressure': _bloodPressureController.text.trim(),
      'Respiratory rate': _respiratoryRateController.text.trim(),
      'Oxygen saturation': _oxygenSatController.text.trim(),
      'Weight': _weightController.text.trim(),
    }..removeWhere((_, value) => value.isEmpty);
    final noteCount = _noteController.text.trim().isEmpty ? 0 : 1;
    final voiceCount = _voiceNoteController.text.trim().isEmpty ? 0 : 1;

    return Scaffold(
      appBar: AppBar(title: const Text('Encounter workspace')),
      bottomNavigationBar: workspace == null || _loading || _error != null
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
                          onPressed: workspace.encounter.status == 'completed' ? null : _openAddMedicationCheck,
                          icon: const Icon(Icons.add),
                          label: const Text('Add medication check'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: canFinalize ? _finalize : null,
                          icon: _finalizing
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.assignment_turned_in_outlined),
                          label: const Text('Finalize encounter'),
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
                title: 'Encounter workspace unavailable',
                body: _error!,
                tone: theme.colorScheme.errorContainer,
                foreground: theme.colorScheme.onErrorContainer,
              )
            else if (workspace != null) ...[
              _EncounterHeaderCard(workspace: workspace),
              const SizedBox(height: 16),
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Medication decisions'),
                    const SizedBox(height: 10),
                    Text(
                      'Medication checks inside this encounter',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    if (workspace.medicationChecks.isEmpty)
                      _InlineMessageCard(
                        icon: Icons.medication_outlined,
                        title: 'No medication checks saved yet',
                        body: 'Add the first medication check before finalizing this encounter.',
                        tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                        foreground: theme.colorScheme.onSurface,
                      )
                    else
                      ...workspace.medicationChecks.map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _EncounterMedicationCheckCard(
                            check: item,
                            onTap: () => _openCheckDetail(item.id),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Visit context'),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Encounter context summary',
                            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: workspace.encounter.status == 'completed'
                              ? null
                              : () => setState(() => _contextExpanded = !_contextExpanded),
                          icon: Icon(_contextExpanded ? Icons.expand_less : Icons.edit_outlined),
                          label: Text(_contextExpanded ? 'Collapse' : 'Edit'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _ResponsiveMetricWrap(
                      items: [
                        _MetricItem(
                          label: 'Complaint',
                          value: _complaintController.text.trim().isEmpty ? 'None' : 'Captured',
                        ),
                        _MetricItem(label: 'Notes', value: '$noteCount'),
                        _MetricItem(label: 'Voice', value: '$voiceCount'),
                        _MetricItem(label: 'Vitals', value: '${capturedVitals.length}'),
                      ],
                    ),
                    if (_complaintController.text.trim().isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _RecordRowCard(
                        icon: Icons.description_outlined,
                        text: 'Complaint\n${_complaintController.text.trim()}',
                      ),
                    ],
                    if (capturedVitals.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _RecordRowCard(
                        icon: Icons.monitor_heart_outlined,
                        text:
                            'Vitals\n${capturedVitals.entries.map((entry) => '${entry.key}: ${entry.value}').join(' • ')}',
                      ),
                    ],
                    if (_contextExpanded) ...[
                      const SizedBox(height: 14),
                      TextField(
                        controller: _complaintController,
                        maxLines: 3,
                        enabled: workspace.encounter.status != 'completed',
                        decoration: const InputDecoration(
                          labelText: 'Presenting complaint',
                          hintText: 'Why is the patient being seen today?',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _noteController,
                        maxLines: 4,
                        enabled: workspace.encounter.status != 'completed',
                        decoration: const InputDecoration(
                          labelText: 'Clinician note',
                          hintText: 'Capture key observations or plan for this visit.',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _voiceNoteController,
                        maxLines: 3,
                        enabled: workspace.encounter.status != 'completed',
                        decoration: const InputDecoration(
                          labelText: 'Voice note transcript',
                          hintText: 'Optional transcript for a recorded voice note.',
                        ),
                      ),
                      const SizedBox(height: 12),
                      _ResponsiveInputWrap(
                        fields: [
                          _InputFieldSpec(label: 'Temperature', hint: 'e.g. 38.2 C', controller: _temperatureController),
                          _InputFieldSpec(label: 'Pulse', hint: 'e.g. 92 bpm', controller: _pulseController),
                          _InputFieldSpec(label: 'Blood pressure', hint: 'e.g. 120/80', controller: _bloodPressureController),
                          _InputFieldSpec(label: 'Respiratory rate', hint: 'e.g. 18 /min', controller: _respiratoryRateController),
                          _InputFieldSpec(label: 'Oxygen saturation', hint: 'e.g. 97%', controller: _oxygenSatController),
                          _InputFieldSpec(label: 'Weight', hint: 'e.g. 63 kg', controller: _weightController),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: workspace.encounter.status == 'completed' || _savingContext
                              ? null
                              : () {
                                  unawaited(_saveContext());
                                },
                          icon: _savingContext
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.save_outlined),
                          label: const Text('Save encounter draft'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (workspace.medicationChecks.isEmpty && workspace.encounter.status != 'completed') ...[
                const SizedBox(height: 12),
                Text(
                  'Add at least one medication check before finalizing this encounter.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
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

class _AddMedicationCheckScreen extends StatefulWidget {
  const _AddMedicationCheckScreen({
    required this.encounterId,
    required this.patientDetail,
  });

  final String encounterId;
  final PatientRecordDetail patientDetail;

  @override
  State<_AddMedicationCheckScreen> createState() => _AddMedicationCheckScreenState();
}

class _AddMedicationCheckScreenState extends State<_AddMedicationCheckScreen> {
  MedicationOption? _selectedMedication;
  SafetyAssessment? _assessment;
  String _action = 'note';
  bool _evaluating = false;
  bool _saving = false;
  String? _error;
  final _noteController = TextEditingController();

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _pickMedication() async {
    final medication = await Navigator.of(context).push<MedicationOption>(
      MaterialPageRoute(builder: (_) => const _MedicationPickerScreen()),
    );
    if (!mounted || medication == null) return;
    setState(() {
      _selectedMedication = medication;
      _assessment = null;
      _error = null;
    });
  }

  Future<void> _runCheck() async {
    final medication = _selectedMedication;
    if (medication == null) return;

    setState(() {
      _evaluating = true;
      _error = null;
    });
    try {
      final assessment = await evaluateMedicationSuitability(
        patientId: widget.patientDetail.patient.id,
        medicationId: medication.id,
      );
      if (!mounted) return;
      setState(() {
        _assessment = assessment;
        _action = switch (assessment.outcome) {
          'safe' => 'note',
          'use_caution' => 'accept',
          'do_not_give' => 'accept',
          _ => 'note',
        };
        _evaluating = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _evaluating = false;
        _error = 'Failed to check medication safety: $e';
      });
    }
  }

  Future<void> _saveMedicationResult() async {
    final assessment = _assessment;
    if (assessment == null) return;

    setState(() => _saving = true);
    try {
      await saveMedicationCheckToEncounter(
        encounterId: widget.encounterId,
        assessment: assessment,
        clinicianAction: _action,
        note: _noteController.text.trim(),
      );
      if (!mounted) return;
      showAppToast('Medication result saved on device');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'Failed to save medication result: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final patient = widget.patientDetail.patient;
    final assessment = _assessment;
    final bottomSafeSpace = MediaQuery.of(context).viewPadding.bottom + 120;
    final actionChoices = const <({String value, String label, String body})>[
      (
        value: 'accept',
        label: 'Accept recommendation',
        body: 'The local safety result guided the final medication decision.',
      ),
      (
        value: 'dismiss',
        label: 'Override recommendation',
        body: 'The local safety result was reviewed but not followed for this encounter.',
      ),
      (
        value: 'note',
        label: 'Add note only',
        body: 'Record the result and context without explicitly accepting or dismissing it.',
      ),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Add medication check')),
      body: _ScreenBackdrop(
        child: ListView(
          padding: EdgeInsets.fromLTRB(20, 20, 20, bottomSafeSpace),
          children: [
            _Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _Eyebrow('Patient context'),
                  const SizedBox(height: 10),
                  Text(
                    patient.fullName,
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (patient.ageYears != null)
                        _ContextChip(label: '${patient.ageYears} years', icon: Icons.cake_outlined),
                      if (patient.sex.isNotEmpty)
                        _ContextChip(label: _formatLabel(patient.sex), icon: Icons.person_outline),
                      if (patient.locationText.isNotEmpty)
                        _ContextChip(label: patient.locationText, icon: Icons.place_outlined),
                      _ContextChip(
                        label: '${widget.patientDetail.allergies.length} allergies',
                        icon: Icons.warning_amber_rounded,
                      ),
                      _ContextChip(
                        label: '${widget.patientDetail.conditions.length} conditions',
                        icon: Icons.monitor_heart_outlined,
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
                  const _Eyebrow('Medication selection'),
                  const SizedBox(height: 10),
                  Text(
                    'Choose a medication from the local catalog',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _pickMedication,
                      icon: const Icon(Icons.search),
                      label: Text(
                        _selectedMedication == null
                            ? 'Search medication catalog'
                            : 'Change medication',
                      ),
                    ),
                  ),
                  if (_selectedMedication != null) ...[
                    const SizedBox(height: 12),
                    _SelectedMedicationCard(medication: _selectedMedication!),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _evaluating ? null : _runCheck,
                        icon: _evaluating
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.health_and_safety_outlined),
                        label: const Text('Check medication safety'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              _InlineMessageCard(
                icon: Icons.error_outline,
                title: 'Medication check unavailable',
                body: _error!,
                tone: theme.colorScheme.errorContainer,
                foreground: theme.colorScheme.onErrorContainer,
              ),
            ],
            if (assessment != null) ...[
              const SizedBox(height: 16),
              _SeverityResultCard(assessment: assessment),
              const SizedBox(height: 16),
              _ReasonAccordionPanel(assessment: assessment),
              const SizedBox(height: 16),
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Clinician action'),
                    const SizedBox(height: 10),
                    Text(
                      'Capture the action for this medication decision',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    ...actionChoices.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _ActionChoiceTile(
                          label: item.label,
                          body: item.body,
                          selected: _action == item.value,
                          onTap: () => setState(() => _action = item.value),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _noteController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Medication check note',
                        hintText: 'Capture the clinical rationale or follow-up plan for this medication decision.',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _saving ? null : _saveMedicationResult,
                  icon: _saving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.save_outlined),
                  label: const Text('Save medication result'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MedicationPickerScreen extends StatefulWidget {
  const _MedicationPickerScreen();

  @override
  State<_MedicationPickerScreen> createState() => _MedicationPickerScreenState();
}

class _MedicationPickerScreenState extends State<_MedicationPickerScreen> {
  List<MedicationOption> _medications = const [];
  String _query = '';
  bool _loading = true;
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
        _error = 'Failed to load medication catalog: $e';
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
    Navigator.of(context).pop(medication);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final query = _query.trim().toLowerCase();
    final filtered = _medications.where((item) {
      if (query.isEmpty) return true;
      return item.brandName.toLowerCase().contains(query) ||
          item.genericName.toLowerCase().contains(query) ||
          item.strengthText.toLowerCase().contains(query) ||
          item.dosageForm.toLowerCase().contains(query);
    }).toList(growable: false);

    return Scaffold(
      appBar: AppBar(title: const Text('Medication picker')),
      body: _ScreenBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          children: [
            _Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _Eyebrow('Local catalog'),
                  const SizedBox(height: 10),
                  Text(
                    'Pick a medication for this encounter',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Use the local catalog when possible. If the medicine is not on the device, add a custom entry and continue with manual review.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    onChanged: (value) => setState(() => _query = value),
                    decoration: const InputDecoration(
                      labelText: 'Search medication',
                      hintText: 'Brand, generic, strength, or dosage form',
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
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _InlineMessageCard(
                icon: Icons.error_outline,
                title: 'Medication picker unavailable',
                body: _error!,
                tone: theme.colorScheme.errorContainer,
                foreground: theme.colorScheme.onErrorContainer,
              )
            else if (filtered.isEmpty)
              Column(
                children: [
                  _InlineMessageCard(
                    icon: Icons.medication_outlined,
                    title: 'No matching medication found',
                    body: 'Try another brand, generic name, strength, or dosage form, or add a custom entry for manual review.',
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
                ],
              )
            else
              ...filtered.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => Navigator.of(context).pop(item),
                    child: Ink(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.brandName,
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            [
                              item.genericName,
                              item.strengthText,
                              item.dosageForm,
                            ].where((value) => value.isNotEmpty).join(' • '),
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                              height: 1.45,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _medicationAvailabilityLabel(item),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CustomMedicationEntryScreen extends StatefulWidget {
  const _CustomMedicationEntryScreen();

  @override
  State<_CustomMedicationEntryScreen> createState() => _CustomMedicationEntryScreenState();
}

class _CustomMedicationEntryScreenState extends State<_CustomMedicationEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _brandNameController = TextEditingController();
  final _genericNameController = TextEditingController();
  final _strengthController = TextEditingController();
  final _dosageFormController = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _brandNameController.dispose();
    _genericNameController.dispose();
    _strengthController.dispose();
    _dosageFormController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) return;

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final medication = await createCustomMedicationOption(
        brandName: _brandNameController.text,
        genericName: _genericNameController.text,
        strengthText: _strengthController.text,
        dosageForm: _dosageFormController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Custom medicine saved locally.')),
      );
      Navigator.of(context).pop(medication);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = 'Failed to save custom medicine: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Custom medicine entry')),
      body: _ScreenBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          children: [
            _Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _Eyebrow('Local fallback'),
                  const SizedBox(height: 10),
                  Text(
                    'Add a medicine that is missing on this device',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'This creates a local custom medicine entry so the encounter can continue offline. Ingredient mapping is not available yet, so the result will require manual review.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _brandNameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Medicine name',
                            hintText: 'For example: Panado Capsules',
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Enter the medicine name.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _genericNameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Generic name',
                            hintText: 'Optional',
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _strengthController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Strength',
                            hintText: 'Optional, for example 500 mg',
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _dosageFormController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: 'Dosage form',
                            hintText: 'Optional, for example tablet or suspension',
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              _InlineMessageCard(
                icon: Icons.error_outline,
                title: 'Custom medicine entry failed',
                body: _error!,
                tone: theme.colorScheme.errorContainer,
                foreground: theme.colorScheme.onErrorContainer,
              ),
            ],
            const SizedBox(height: 16),
            _Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _Eyebrow('What happens next'),
                  const SizedBox(height: 10),
                  Text(
                    'AidSync will save this medicine on-device and make it available in the encounter flow.',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'The medication can be checked and attached to the encounter immediately, but the app will recommend manual review until richer reference data is prepared online.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: FilledButton.icon(
          onPressed: _saving ? null : _save,
          icon: _saving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2.2),
                )
              : const Icon(Icons.save_outlined),
          label: Text(_saving ? 'Saving locally...' : 'Save custom medicine'),
        ),
      ),
    );
  }
}

class _MedicationCheckDetailScreen extends StatefulWidget {
  const _MedicationCheckDetailScreen({
    required this.checkId,
  });

  final String checkId;

  @override
  State<_MedicationCheckDetailScreen> createState() => _MedicationCheckDetailScreenState();
}

class _MedicationCheckDetailScreenState extends State<_MedicationCheckDetailScreen> {
  MedicationCheckDraft? _check;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadCheck());
  }

  Future<void> _loadCheck() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final check = await loadMedicationCheckDetail(widget.checkId);
      if (!mounted) return;
      setState(() {
        _check = check;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load medication check: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final check = _check;

    return Scaffold(
      appBar: AppBar(title: const Text('Medication check')),
      body: _ScreenBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          children: [
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _InlineMessageCard(
                icon: Icons.error_outline,
                title: 'Medication check unavailable',
                body: _error!,
                tone: theme.colorScheme.errorContainer,
                foreground: theme.colorScheme.onErrorContainer,
              )
            else if (check != null) ...[
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Saved result'),
                    const SizedBox(height: 10),
                    Text(
                      check.medicationName,
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (check.strengthText.isNotEmpty)
                          _ContextChip(label: check.strengthText, icon: Icons.straighten),
                        if (check.dosageForm.isNotEmpty)
                          _ContextChip(label: check.dosageForm, icon: Icons.category_outlined),
                        _ContextChip(
                          label: check.pendingSync ? 'Pending sync' : 'Saved locally',
                          icon: Icons.sync_outlined,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    _OutcomeBadge(outcome: check.outcome),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Why'),
                    const SizedBox(height: 10),
                    Text(
                      'Detailed reasons',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    if (check.reasons.isEmpty)
                      _InlineMessageCard(
                        icon: Icons.check_circle_outline,
                        title: 'No blocking reasons stored',
                        body: 'This saved check did not capture red or amber reasons.',
                        tone: const Color(0xFFD9ECDF),
                        foreground: const Color(0xFF027A48),
                      )
                    else
                      ...check.reasons.map(
                        (reason) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _ReasonExpansionCard(reason: reason),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Clinician action'),
                    const SizedBox(height: 10),
                    Text(
                      check.action == null ? 'No action captured' : _formatLabel(check.action!),
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if ((check.note ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        check.note!,
                        style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EncounterHandoffSummaryScreen extends StatefulWidget {
  const _EncounterHandoffSummaryScreen({
    required this.encounterId,
  });

  final String encounterId;

  @override
  State<_EncounterHandoffSummaryScreen> createState() => _EncounterHandoffSummaryScreenState();
}

class _EncounterHandoffSummaryScreenState extends State<_EncounterHandoffSummaryScreen> {
  EncounterWorkspaceData? _workspace;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadSummary());
  }

  Future<void> _loadSummary() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final workspace = await loadEncounterWorkspace(widget.encounterId);
      if (!mounted) return;
      setState(() {
        _workspace = workspace;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load handoff summary: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final workspace = _workspace;
    final vitals = workspace?.vitals.entries
            .where((entry) => entry.value.trim().isNotEmpty)
            .toList(growable: false) ??
        const [];
    final bottomSafeSpace = MediaQuery.of(context).viewPadding.bottom + 28;

    return Scaffold(
      appBar: AppBar(title: const Text('Handoff summary')),
      body: _ScreenBackdrop(
        child: ListView(
          padding: EdgeInsets.fromLTRB(20, 20, 20, bottomSafeSpace),
          children: [
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _InlineMessageCard(
                icon: Icons.error_outline,
                title: 'Handoff summary unavailable',
                body: _error!,
                tone: theme.colorScheme.errorContainer,
                foreground: theme.colorScheme.onErrorContainer,
              )
            else if (workspace != null) ...[
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Patient handoff'),
                    const SizedBox(height: 10),
                    Text(
                      workspace.patientDetail.patient.fullName,
                      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _ContextChip(
                          label: workspace.encounter.status == 'completed'
                              ? 'Encounter finalized'
                              : 'Encounter draft',
                          icon: Icons.assignment_turned_in_outlined,
                        ),
                        _ContextChip(
                          label: workspace.encounter.pendingSync ? 'Pending sync' : 'Synced or ready',
                          icon: Icons.sync_outlined,
                        ),
                        if (workspace.patientDetail.patient.locationText.isNotEmpty)
                          _ContextChip(
                            label: workspace.patientDetail.patient.locationText,
                            icon: Icons.place_outlined,
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    _ResponsiveMetricWrap(
                      items: [
                        _MetricItem(
                          label: 'Medication checks',
                          value: '${workspace.medicationChecks.length}',
                        ),
                        _MetricItem(
                          label: 'Highest severity',
                          value: workspace.encounter.highestSeverity == null
                              ? 'Not set'
                              : _severityLabel(workspace.encounter.highestSeverity!),
                        ),
                        _MetricItem(
                          label: 'Updated',
                          value: _formatRelativeTime(workspace.encounter.updatedAt),
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
                    const _Eyebrow('Visit context'),
                    const SizedBox(height: 10),
                    Text(
                      'Clinical summary',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    if ((workspace.encounter.presentingComplaint ?? '').trim().isNotEmpty)
                      _RecordRowCard(
                        icon: Icons.description_outlined,
                        text: 'Presenting complaint\n${workspace.encounter.presentingComplaint!.trim()}',
                      ),
                    if ((workspace.encounter.clinicianNote ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _RecordRowCard(
                        icon: Icons.note_alt_outlined,
                        text: 'Clinician note\n${workspace.encounter.clinicianNote!.trim()}',
                      ),
                    ],
                    if (workspace.voiceNoteTranscript.trim().isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _RecordRowCard(
                        icon: Icons.mic_none_outlined,
                        text: 'Voice note transcript\n${workspace.voiceNoteTranscript.trim()}',
                      ),
                    ],
                    if (vitals.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: vitals
                            .map(
                              (entry) => Chip(label: Text('${entry.key}: ${entry.value}')),
                            )
                            .toList(growable: false),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Medication decisions'),
                    const SizedBox(height: 10),
                    Text(
                      'What was checked during this encounter',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    if (workspace.medicationChecks.isEmpty)
                      _InlineMessageCard(
                        icon: Icons.medication_outlined,
                        title: 'No medication decisions saved',
                        body: 'This encounter does not contain a medication safety decision yet.',
                        tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                        foreground: theme.colorScheme.onSurface,
                      )
                    else
                      ...workspace.medicationChecks.map(
                        (check) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _HandoffMedicationDecisionCard(check: check),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EncounterCard extends StatelessWidget {
  const _EncounterCard({
    required this.encounter,
    required this.onTap,
  });

  final EncounterDraft encounter;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    encounter.patientName,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${encounter.status == 'draft' ? 'Draft encounter' : 'Completed encounter'} • ${encounter.medicationChecksCount} medication checks',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _EncounterStatusBadge(
                        label: encounter.pendingSync ? 'Pending sync' : 'Synced',
                        color: encounter.pendingSync ? theme.colorScheme.primary : const Color(0xFF027A48),
                      ),
                      if ((encounter.highestSeverity ?? '').isNotEmpty)
                        _EncounterStatusBadge(
                          label: _severityLabel(encounter.highestSeverity!),
                          color: _severityColor(encounter.highestSeverity!),
                        ),
                      _EncounterStatusBadge(
                        label: 'Updated ${_formatRelativeTime(encounter.updatedAt)}',
                        color: theme.colorScheme.secondary,
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
    );
  }
}

class _HandoffMedicationDecisionCard extends StatelessWidget {
  const _HandoffMedicationDecisionCard({
    required this.check,
  });

  final MedicationCheckDraft check;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final topReasons = check.reasons.take(2).toList(growable: false);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.36),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      check.medicationName,
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      [
                        if (check.strengthText.isNotEmpty) check.strengthText,
                        if (check.dosageForm.isNotEmpty) check.dosageForm,
                      ].join(' • '),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              _OutcomeBadge(outcome: check.outcome),
            ],
          ),
          if (check.action != null || (check.note ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            _RecordRowCard(
              icon: Icons.assignment_turned_in_outlined,
              text: [
                if (check.action != null) 'Action: ${_formatLabel(check.action!)}',
                if ((check.note ?? '').trim().isNotEmpty) 'Note: ${check.note!.trim()}',
              ].join('\n'),
            ),
          ],
          if (topReasons.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...topReasons.map(
              (reason) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _RecordRowCard(
                  icon: Icons.warning_amber_rounded,
                  text: '${reason.title}\n${reason.detail}',
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _EncounterHeaderCard extends StatelessWidget {
  const _EncounterHeaderCard({
    required this.workspace,
  });

  final EncounterWorkspaceData workspace;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final patient = workspace.patientDetail.patient;
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _EncounterStatusBadge(
                label: workspace.encounter.status == 'draft' ? 'Draft encounter' : 'Completed encounter',
                color: workspace.encounter.status == 'draft'
                    ? theme.colorScheme.primary
                    : const Color(0xFF027A48),
              ),
              _EncounterStatusBadge(
                label: workspace.encounter.pendingSync ? 'Pending sync' : 'Synced',
                color: workspace.encounter.pendingSync
                    ? theme.colorScheme.primary
                    : const Color(0xFF027A48),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            patient.fullName,
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (patient.ageYears != null)
                _ContextChip(label: '${patient.ageYears} years', icon: Icons.cake_outlined),
              if (patient.sex.isNotEmpty)
                _ContextChip(label: _formatLabel(patient.sex), icon: Icons.person_outline),
              if (patient.locationText.isNotEmpty)
                _ContextChip(label: patient.locationText, icon: Icons.place_outlined),
              _ContextChip(
                label: '${workspace.patientDetail.allergies.length} allergies',
                icon: Icons.warning_amber_rounded,
              ),
              _ContextChip(
                label: '${workspace.patientDetail.conditions.length} conditions',
                icon: Icons.monitor_heart_outlined,
              ),
              _ContextChip(
                label: '${workspace.patientDetail.currentMedications.length} current meds',
                icon: Icons.medication_liquid_outlined,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EncounterMedicationCheckCard extends StatelessWidget {
  const _EncounterMedicationCheckCard({
    required this.check,
    required this.onTap,
  });

  final MedicationCheckDraft check;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final topReason = check.reasons.firstOrNull;
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    check.medicationName,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                _OutcomeBadge(outcome: check.outcome),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              [
                check.strengthText,
                check.dosageForm,
              ].where((value) => value.isNotEmpty).join(' • '),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            if (topReason != null) ...[
              const SizedBox(height: 10),
              Text(
                topReason.title,
                style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                topReason.detail,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.45,
                ),
              ),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if ((check.action ?? '').isNotEmpty)
                  _EncounterStatusBadge(
                    label: _formatLabel(check.action!),
                    color: theme.colorScheme.secondary,
                  ),
                _EncounterStatusBadge(
                  label: check.pendingSync ? 'Pending sync' : 'Saved locally',
                  color: check.pendingSync ? theme.colorScheme.primary : const Color(0xFF027A48),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SelectedMedicationCard extends StatelessWidget {
  const _SelectedMedicationCard({
    required this.medication,
  });

  final MedicationOption medication;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            medication.brandName,
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            [
              medication.genericName,
              medication.strengthText,
              medication.dosageForm,
            ].where((value) => value.isNotEmpty).join(' • '),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 10),
          _ContextChip(
            label: _medicationAvailabilityLabel(medication),
            icon: medication.sourceName == 'custom_mobile_entry'
                ? Icons.edit_note_outlined
                : Icons.offline_pin_outlined,
          ),
        ],
      ),
    );
  }
}

class _EncounterStatusBadge extends StatelessWidget {
  const _EncounterStatusBadge({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

