part of '../../main.dart';

class _PageHeader extends StatelessWidget {
  const _PageHeader({required this.eyebrow, required this.title, required this.body});

  final String eyebrow;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Eyebrow(eyebrow),
          const SizedBox(height: 10),
          Text(title, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(body, style: theme.textTheme.bodyLarge?.copyWith(height: 1.5)),
        ],
      ),
    );
  }
}

class _PatientDetailSummary extends StatelessWidget {
  const _PatientDetailSummary({
    required this.detail,
  });

  final PatientRecordDetail detail;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final patient = detail.patient;
    final riskTags = _patientRiskTags(patient);
    final maxSystolic = detail.bloodPressureTrend
        .fold<int>(0, (currentMax, item) => item.systolic > currentMax ? item.systolic : currentMax);

    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const _StatusPill(
                label: 'Offline ready',
                foreground: Color(0xFF1F7A52),
              ),
              const SizedBox(width: 8),
              if (patient.locationText.isNotEmpty)
                _StatusPill(
                  label: patient.locationText,
                  foreground: theme.colorScheme.primary,
                ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.14),
                foregroundColor: theme.colorScheme.primary,
                child: Text(
                  patient.fullName.isEmpty ? '?' : patient.fullName.characters.first.toUpperCase(),
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      patient.fullName,
                      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Review risk context first, then move into the medication check.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (riskTags.isNotEmpty) ...[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: riskTags
                  .map(
                    (tag) => _EncounterStatusBadge(
                      label: tag,
                      color: theme.colorScheme.error,
                    ),
                  )
                  .toList(growable: false),
            ),
            const SizedBox(height: 12),
          ],
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Chip(label: Text(patient.sex.isEmpty ? 'Sex unknown' : _formatLabel(patient.sex))),
              Chip(label: Text(patient.ageYears == null ? 'Age unknown' : '${patient.ageYears} years')),
              Chip(
                label: Text(
                  patient.pregnancyStatus.isEmpty
                      ? 'Pregnancy unknown'
                      : _formatLabel(patient.pregnancyStatus),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(18),
            ),
            child: _ResponsiveMetricWrap(
              items: [
                _MetricItem(label: 'Allergies', value: '${detail.allergies.length}'),
                _MetricItem(label: 'Conditions', value: '${detail.conditions.length}'),
                _MetricItem(label: 'Current meds', value: '${detail.currentMedications.length}'),
              ],
            ),
          ),
          if (detail.bloodPressureTrend.isNotEmpty) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF6FBFC),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.12)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.monitor_heart_outlined, color: theme.colorScheme.primary, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Recent blood pressure',
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'From local encounter history on this device.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: detail.bloodPressureTrend
                        .map(
                          (reading) => Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: _BloodPressureTrendBar(
                                reading: reading,
                                maxSystolic: maxSystolic,
                              ),
                            ),
                          ),
                        )
                        .toList(growable: false),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _BloodPressureTrendBar extends StatelessWidget {
  const _BloodPressureTrendBar({
    required this.reading,
    required this.maxSystolic,
  });

  final BloodPressureReading reading;
  final int maxSystolic;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final heightFactor = maxSystolic <= 0 ? 0.4 : (reading.systolic / maxSystolic).clamp(0.35, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 64,
          alignment: Alignment.bottomLeft,
          child: FractionallySizedBox(
            alignment: Alignment.bottomCenter,
            heightFactor: heightFactor,
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFF78CEE0), Color(0xFF0E8AA8)],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          reading.value,
          style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 2),
        Text(
          reading.label,
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
      ],
    );
  }
}

class _MedicationReferenceSummary extends StatelessWidget {
  const _MedicationReferenceSummary({
    required this.detail,
  });

  final MedicationReferenceDetail detail;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final medication = detail.medication;

    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.14),
                foregroundColor: theme.colorScheme.primary,
                child: const Icon(Icons.medication_outlined, size: 30),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      medication.brandName,
                      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      detail.sourceName == 'custom_mobile_entry'
                          ? 'Added locally on this device for manual review when a prepared reference is not available yet.'
                          : 'Prepared online and synced to local SQLite for offline review and treatment checks.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (medication.genericName.isNotEmpty) Chip(label: Text(medication.genericName)),
              if (medication.strengthText.isNotEmpty) Chip(label: Text(medication.strengthText)),
              if (medication.dosageForm.isNotEmpty) Chip(label: Text(medication.dosageForm)),
              if (detail.manufacturerName.isNotEmpty) Chip(label: Text(detail.manufacturerName)),
              if (detail.sourceName.isNotEmpty)
                Chip(label: Text(_medicationSourceLabel(detail.sourceName))),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(18),
            ),
            child: _ResponsiveMetricWrap(
              items: [
                _MetricItem(label: 'Ingredients', value: '${detail.ingredients.length}'),
                _MetricItem(label: 'Contraindications', value: '${detail.contraindications.length}'),
                _MetricItem(label: 'Interactions', value: '${detail.interactions.length}'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniMetric extends StatelessWidget {
  const _MiniMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.labelMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _MetricItem {
  const _MetricItem({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;
}

class _ResponsiveMetricWrap extends StatelessWidget {
  const _ResponsiveMetricWrap({
    required this.items,
  });

  final List<_MetricItem> items;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;
        final columnCount = maxWidth < 360 ? 1 : maxWidth < 560 ? 2 : 3;
        final gap = 12.0;
        final itemWidth = ((maxWidth - (gap * (columnCount - 1))) / columnCount).clamp(120.0, maxWidth);

        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: items
              .map(
                (item) => SizedBox(
                  width: itemWidth,
                  child: _MiniMetric(
                    label: item.label,
                    value: item.value,
                  ),
                ),
              )
              .toList(growable: false),
        );
      },
    );
  }
}

class _CompactListBlock extends StatelessWidget {
  const _CompactListBlock({
    required this.title,
    required this.items,
    required this.icon,
  });

  final String title;
  final List<String> items;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: items.map((item) => Chip(label: Text(item))).toList(growable: false),
          ),
        ],
      ),
    );
  }
}

class _InputFieldSpec {
  const _InputFieldSpec({
    required this.label,
    required this.hint,
    required this.controller,
  });

  final String label;
  final String hint;
  final TextEditingController controller;
}

class _ResponsiveInputWrap extends StatelessWidget {
  const _ResponsiveInputWrap({
    required this.fields,
  });

  final List<_InputFieldSpec> fields;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;
        final columnCount = maxWidth < 420 ? 1 : 2;
        final gap = 12.0;
        final itemWidth = ((maxWidth - (gap * (columnCount - 1))) / columnCount).clamp(160.0, maxWidth);

        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: fields
              .map(
                (field) => SizedBox(
                  width: itemWidth,
                  child: TextField(
                    controller: field.controller,
                    decoration: InputDecoration(
                      labelText: field.label,
                      hintText: field.hint,
                    ),
                  ),
                ),
              )
              .toList(growable: false),
        );
      },
    );
  }
}

class _VitalFieldSpec {
  const _VitalFieldSpec({
    required this.label,
    required this.hint,
    required this.controller,
    required this.icon,
    required this.unit,
    this.keyboardType = TextInputType.text,
  });

  final String label;
  final String hint;
  final TextEditingController controller;
  final IconData icon;
  final String unit;
  final TextInputType keyboardType;
}

class _VitalsCaptureGrid extends StatelessWidget {
  const _VitalsCaptureGrid({
    required this.fields,
    required this.systolicController,
    required this.diastolicController,
    this.enabled = true,
  });

  final List<_VitalFieldSpec> fields;
  final TextEditingController systolicController;
  final TextEditingController diastolicController;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;
        final columnCount = maxWidth < 520 ? 1 : 2;
        final gap = 12.0;
        final itemWidth = ((maxWidth - (gap * (columnCount - 1))) / columnCount).clamp(220.0, maxWidth);

        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            SizedBox(
              width: itemWidth,
              child: _BloodPressureCaptureCard(
                systolicController: systolicController,
                diastolicController: diastolicController,
                enabled: enabled,
              ),
            ),
            ...fields.map(
              (field) => SizedBox(
                width: itemWidth,
                child: _VitalCaptureCard(
                  label: field.label,
                  hint: field.hint,
                  unit: field.unit,
                  icon: field.icon,
                  controller: field.controller,
                  keyboardType: field.keyboardType,
                  enabled: enabled,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _VitalCaptureCard extends StatelessWidget {
  const _VitalCaptureCard({
    required this.label,
    required this.hint,
    required this.unit,
    required this.icon,
    required this.controller,
    required this.keyboardType,
    required this.enabled,
  });

  final String label;
  final String hint;
  final String unit;
  final IconData icon;
  final TextEditingController controller;
  final TextInputType keyboardType;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: theme.colorScheme.primary, size: 16),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                    Text(
                      unit,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: controller,
            enabled: enabled,
            keyboardType: keyboardType,
            decoration: InputDecoration(
              labelText: label,
              hintText: hint,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _BloodPressureCaptureCard extends StatelessWidget {
  const _BloodPressureCaptureCard({
    required this.systolicController,
    required this.diastolicController,
    required this.enabled,
  });

  final TextEditingController systolicController;
  final TextEditingController diastolicController;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF5FBFD),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.monitor_heart_outlined, color: theme.colorScheme.primary, size: 16),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Blood pressure',
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      'Capture systolic and diastolic separately',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: systolicController,
                  enabled: enabled,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Systolic',
                    hintText: '120',
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Text(
                  '/',
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              Expanded(
                child: TextField(
                  controller: diastolicController,
                  enabled: enabled,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Diastolic',
                    hintText: '80',
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Recorded as mmHg',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _RecordSection extends StatelessWidget {
  const _RecordSection({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.empty,
    required this.rows,
    required this.rowBuilder,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final String empty;
  final List<Map<String, Object?>> rows;
  final String Function(Map<String, Object?> row) rowBuilder;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: theme.colorScheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),
          if (rows.isEmpty)
            _InlineMessageCard(
              icon: icon,
              title: title,
              body: empty,
              tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
              foreground: theme.colorScheme.onSurface,
            )
          else
            ...rows.map(
              (row) => _RecordRowCard(
                text: rowBuilder(row),
                icon: icon,
              ),
            ),
        ],
      ),
    );
  }
}

class _HeroPanel extends StatelessWidget {
  const _HeroPanel({required this.session, required this.buildLabel});

  final Session session;
  final String buildLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0C6F8A), Color(0xFF0E8AA8), Color(0xFF13A47F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0E8AA8).withValues(alpha: 0.22),
            blurRadius: 30,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('AidSync Mobile', style: theme.textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(
            'A field-ready medication safety sidekick for low-connectivity care.',
            style: theme.textTheme.bodyLarge?.copyWith(color: Colors.white.withValues(alpha: 0.88), height: 1.5),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _ChipTag(label: 'Signed in: ${session.user.email ?? 'Unknown user'}'),
              _ChipTag(label: buildLabel),
              const _ChipTag(label: 'Prepared online, used offline'),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({
    required this.status,
    required this.restoredSession,
    required this.snapshot,
  });

  final SyncStatus? status;
  final bool restoredSession;
  final SyncSnapshot? snapshot;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasLocalData = (snapshot?.counts.values.fold<int>(0, (a, b) => a + b) ?? 0) > 0;
    final isLocalOnly = restoredSession && hasLocalData && (status == null || !status!.connected);

    late final Color bg;
    late final Color fg;
    late final IconData icon;
    late final String title;
    late final String body;

    if (status != null && status!.connected) {
      bg = theme.colorScheme.primaryContainer;
      fg = theme.colorScheme.onPrimaryContainer;
      icon = Icons.cloud_done;
      title = status!.downloading ? 'Syncing updates' : 'Device ready';
      body = status!.downloading
          ? 'PowerSync is connected and downloading updates from the backend.'
          : 'Local data is ready and PowerSync is connected.';
    } else if (isLocalOnly) {
      bg = theme.colorScheme.tertiaryContainer;
      fg = theme.colorScheme.onTertiaryContainer;
      icon = Icons.lock_clock;
      title = 'Local-only mode';
      body = 'A previous session and local SQLite data are available. Care workflows can continue while sync is paused.';
    } else {
      bg = theme.colorScheme.surfaceContainerHighest;
      fg = theme.colorScheme.onSurface;
      icon = Icons.wifi_off;
      title = 'Sync paused';
      body = 'Connect online again to refresh the session and resume PowerSync.';
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: fg),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleMedium?.copyWith(color: fg, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(body, style: theme.textTheme.bodyMedium?.copyWith(color: fg, height: 1.5)),
                if (snapshot != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _StatusPill(label: '${snapshot!.counts['patients'] ?? 0} patients', foreground: fg),
                      const SizedBox(width: 8),
                      _StatusPill(label: '${snapshot!.counts['medication_catalog'] ?? 0} medications', foreground: fg),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RecordRowCard extends StatelessWidget {
  const _RecordRowCard({
    required this.text,
    required this.icon,
  });

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final parts = text.split('\n').where((item) => item.trim().isNotEmpty).toList(growable: false);
    final title = parts.isEmpty ? text : parts.first;
    final supporting = parts.skip(1).toList(growable: false);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: Icon(icon, size: 18, color: theme.colorScheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                if (supporting.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  ...supporting.map(
                    (line) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        line,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          height: 1.45,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _WorkflowStep extends StatelessWidget {
  const _WorkflowStep({
    required this.step,
    required this.title,
    required this.body,
  });

  final String step;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(999),
          ),
          alignment: Alignment.center,
          child: Text(
            step,
            style: theme.textTheme.labelLarge?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                body,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({
    required this.child,
    this.background = Colors.white,
    this.borderColor,
    this.padding = const EdgeInsets.all(20),
  });

  final Widget child;
  final Color background;
  final Color? borderColor;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderColor ?? Colors.black.withValues(alpha: 0.04)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0E8AA8).withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _ScreenBackdrop extends StatelessWidget {
  const _ScreenBackdrop({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFFE9F7FA),
            Color(0xFFF6FBFB),
            Color(0xFFF3F7F4),
          ],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -80,
            right: -30,
            child: _BackdropOrb(
              size: 220,
              color: Color(0xFF7BE0E5),
            ),
          ),
          Positioned(
            top: 160,
            left: -90,
            child: _BackdropOrb(
              size: 180,
              color: Color(0xFFBFEADF),
            ),
          ),
          Positioned(
            bottom: -70,
            right: 20,
            child: _BackdropOrb(
              size: 180,
              color: Color(0xFFB8E7F0),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class _BackdropOrb extends StatelessWidget {
  const _BackdropOrb({
    required this.size,
    required this.color,
  });

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color.withValues(alpha: 0.22),
        ),
      ),
    );
  }
}

class _ChipTag extends StatelessWidget {
  const _ChipTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.foreground});

  final String label;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: foreground.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _Eyebrow extends StatelessWidget {
  const _Eyebrow(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: Theme.of(context).textTheme.labelMedium?.copyWith(
            letterSpacing: 1.4,
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.primary,
          ),
    );
  }
}


class _MedicationCheckPanel extends StatefulWidget {
  const _MedicationCheckPanel({
    required this.onEncounterSaved,
    required this.onOpenPatients,
    required this.onOpenMedications,
  });

  final Future<void> Function() onEncounterSaved;
  final VoidCallback onOpenPatients;
  final VoidCallback onOpenMedications;

  @override
  State<_MedicationCheckPanel> createState() => _MedicationCheckPanelState();
}

class _MedicationCheckPanelState extends State<_MedicationCheckPanel> {
  List<PatientOption> _patients = const [];
  List<MedicationOption> _medications = const [];
  String? _selectedPatientId;
  String? _selectedMedicationId;
  SafetyAssessment? _assessment;
  bool _loading = true;
  bool _evaluating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadOptions());
  }

  Future<void> _loadOptions() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final patients = await loadPatientOptions();
      final medications = await loadMedicationOptions();
      if (!mounted) return;
      setState(() {
        _patients = patients;
        _medications = medications;
        _selectedPatientId = patients.isNotEmpty ? patients.first.id : null;
        _selectedMedicationId = medications.isNotEmpty ? medications.first.id : null;
        _loading = false;
      });
      if (_selectedPatientId != null && _selectedMedicationId != null) {
        await _runAssessment();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load local options: $e';
      });
    }
  }

  Future<void> _runAssessment() async {
    final patientId = _selectedPatientId;
    final medicationId = _selectedMedicationId;
    if (patientId == null || medicationId == null) {
      return;
    }

    setState(() {
      _evaluating = true;
      _error = null;
    });
    try {
      final assessment = await evaluateMedicationSuitability(
        patientId: patientId,
        medicationId: medicationId,
      );
      if (!mounted) return;
      setState(() {
        _assessment = assessment;
        _evaluating = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _evaluating = false;
        _error = 'Failed to evaluate suitability: $e';
      });
    }
  }

  PatientOption? get _selectedPatientOption {
    for (final patient in _patients) {
      if (patient.id == _selectedPatientId) return patient;
    }
    return null;
  }

  MedicationOption? get _selectedMedicationOption {
    for (final medication in _medications) {
      if (medication.id == _selectedMedicationId) return medication;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final assessment = _assessment;
    final selectedPatient = _selectedPatientOption;
    final selectedMedication = _selectedMedicationOption;
    final patientRiskChips = <Widget>[
      if (selectedPatient?.ageYears != null)
        _ContextChip(label: '${selectedPatient?.ageYears} years', icon: Icons.cake_outlined),
      if ((selectedPatient?.sex ?? '').isNotEmpty)
        _ContextChip(label: _formatLabel(selectedPatient?.sex ?? ''), icon: Icons.person_outline),
      if ((selectedPatient?.pregnancyStatus ?? '').isNotEmpty)
        _ContextChip(
          label: _formatLabel(selectedPatient?.pregnancyStatus ?? ''),
          icon: Icons.pregnant_woman_outlined,
          tone: _isPregnancyStatus(selectedPatient?.pregnancyStatus ?? '')
              ? const Color(0xFF9A6A11)
              : theme.colorScheme.primary,
        ),
      if ((selectedPatient?.locationText ?? '').isNotEmpty)
        _ContextChip(label: selectedPatient?.locationText ?? '', icon: Icons.place_outlined),
      if (assessment != null && assessment.allergyNames.isNotEmpty)
        _ContextChip(label: '${assessment.allergyNames.length} allergy flags', icon: Icons.warning_amber_rounded, tone: const Color(0xFF9A6A11)),
      if (assessment != null && assessment.conditionNames.isNotEmpty)
        _ContextChip(label: '${assessment.conditionNames.length} conditions', icon: Icons.monitor_heart_outlined),
      if (assessment != null && assessment.currentMedicationNames.isNotEmpty)
        _ContextChip(label: '${assessment.currentMedicationNames.length} chronic meds', icon: Icons.medication_liquid_outlined),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Eyebrow('Check setup'),
              const SizedBox(height: 8),
              Text(
                'Choose the patient and treatment',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'This screen is the decision cockpit. Select the patient and medication, then review the returned severity before recording the visit outcome.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 18),
              if (_loading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: CircularProgressIndicator(),
                  ),
                )
              else ...[
                DropdownButtonFormField<String>(
                  initialValue: _selectedPatientId,
                  items: _patients
                      .map(
                        (item) => DropdownMenuItem<String>(
                          value: item.id,
                          child: Text(
                            '${item.fullName}${item.ageYears == null ? '' : ' • ${item.ageYears}y'}',
                          ),
                        ),
                      )
                      .toList(growable: false),
                  onChanged: (value) {
                    setState(() {
                      _selectedPatientId = value;
                    });
                    unawaited(_runAssessment());
                  },
                  decoration: const InputDecoration(labelText: 'Patient'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _selectedMedicationId,
                  items: _medications
                      .map(
                        (item) => DropdownMenuItem<String>(
                          value: item.id,
                          child: Text(
                            '${item.brandName}${item.strengthText.isEmpty ? '' : ' • ${item.strengthText}'}',
                          ),
                        ),
                      )
                      .toList(growable: false),
                  onChanged: (value) {
                    setState(() {
                      _selectedMedicationId = value;
                    });
                    unawaited(_runAssessment());
                  },
                  decoration: const InputDecoration(labelText: 'Medication'),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: widget.onOpenPatients,
                        icon: const Icon(Icons.folder_shared_outlined),
                        label: const Text('Open patient queue'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: widget.onOpenMedications,
                        icon: const Icon(Icons.medication_outlined),
                        label: const Text('Open medications'),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        if (selectedPatient != null) ...[
          const SizedBox(height: 14),
          _CockpitContextCard(
            icon: Icons.person_outline,
            label: 'Zone A · patient context',
            title: selectedPatient.fullName,
            subtitle: [
              selectedPatient.ageYears == null ? 'Age unknown' : '${selectedPatient.ageYears} years',
              selectedPatient.sex.isEmpty ? 'Sex unknown' : _formatLabel(selectedPatient.sex),
            ].join(' • '),
            chips: patientRiskChips,
          ),
        ],
        if (selectedMedication != null) ...[
          const SizedBox(height: 14),
          _CockpitContextCard(
            icon: Icons.medication_outlined,
            label: 'Zone B · medication context',
            title: selectedMedication.brandName,
            subtitle: [
              selectedMedication.genericName,
              selectedMedication.strengthText,
              selectedMedication.dosageForm,
            ].where((item) => item.isNotEmpty).join(' • '),
            chips: assessment?.ingredientNames
                    .map((item) => _ContextChip(label: item, icon: Icons.science_outlined))
                    .toList(growable: false) ??
                const [],
          ),
        ],
        if (_evaluating) ...[
          const SizedBox(height: 14),
          const _AssessmentProgressCard(),
        ],
        if (_error != null) ...[
          const SizedBox(height: 14),
          _InlineMessageCard(
            icon: Icons.error_outline,
            title: 'Assessment unavailable',
            body: _error!,
            tone: theme.colorScheme.errorContainer,
            foreground: theme.colorScheme.onErrorContainer,
          ),
        ],
        if (assessment != null) ...[
          const SizedBox(height: 14),
          _SeverityResultCard(assessment: assessment),
          const SizedBox(height: 14),
          _ReasonAccordionPanel(assessment: assessment),
          const SizedBox(height: 14),
          _CheckPersistenceBar(
            assessment: assessment,
            onSave: () async {
              final saved = await Navigator.of(context).push<bool>(
                MaterialPageRoute(
                  builder: (_) => _EncounterRecordScreen(assessment: assessment),
                ),
              );
              if (saved == true) {
                await widget.onEncounterSaved();
              }
            },
          ),
        ],
      ],
    );
  }
}

class _PatientEntryScreen extends StatefulWidget {
  const _PatientEntryScreen();

  @override
  State<_PatientEntryScreen> createState() => _PatientEntryScreenState();
}

class _PatientEntryScreenState extends State<_PatientEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _dobController = TextEditingController();
  final _locationController = TextEditingController();
  DateTime? _selectedDob;
  String _sex = 'female';
  String _pregnancyStatus = 'not_pregnant';
  bool _saving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _dobController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  bool get _showPregnancyStatus => _sex == 'female' || _sex == 'other';

  Future<void> _pickDateOfBirth() async {
    final now = DateTime.now();
    final initialDate =
        _selectedDob ?? DateTime(now.year - 28, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1900),
      lastDate: now,
      helpText: 'Select date of birth',
    );

    if (picked == null) return;

    setState(() {
      _selectedDob = picked;
      _dobController.text = _formatDate(picked);
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await createPatientRecord(
        fullName: _nameController.text.trim(),
        dob: _dobController.text.trim(),
        sex: _sex,
        pregnancyStatus: _pregnancyStatus,
        locationText: _locationController.text.trim(),
      );
      if (!mounted) return;
      showAppToast('Patient added locally');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      showAppToast('Failed to add patient: $e');
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('New patient')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const _PageHeader(
            eyebrow: 'Patient entry',
            title: 'Create a local patient file',
            body: 'Capture the essentials first. This record saves on-device immediately and syncs back when connectivity returns.',
          ),
          const SizedBox(height: 16),
          _Panel(
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Identity',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Full name'),
                    validator: (value) => (value == null || value.trim().isEmpty) ? 'Full name is required.' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _dobController,
                    readOnly: true,
                    onTap: _pickDateOfBirth,
                    decoration: InputDecoration(
                      labelText: 'Date of birth',
                      hintText: 'Choose a date',
                      suffixIcon: IconButton(
                        onPressed: _pickDateOfBirth,
                        icon: const Icon(Icons.calendar_today_outlined),
                      ),
                    ),
                    validator: (value) => (value == null || value.trim().isEmpty)
                        ? 'Date of birth is required.'
                        : null,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Clinical context',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _sex,
                    decoration: const InputDecoration(labelText: 'Sex'),
                    items: const [
                      DropdownMenuItem(value: 'female', child: Text('Female')),
                      DropdownMenuItem(value: 'male', child: Text('Male')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: (value) {
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
                      onChanged: (value) => setState(() => _pregnancyStatus = value ?? _pregnancyStatus),
                    ),
                  ],
                  const SizedBox(height: 20),
                  Text(
                    'Location',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _locationController,
                    decoration: const InputDecoration(
                      labelText: 'Location or facility',
                      hintText: 'Village, clinic, or outreach site',
                    ),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.phone_iphone_outlined, color: theme.colorScheme.primary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'This patient file is written to local SQLite first and uploaded later when connectivity returns.',
                            style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _saving ? null : _save,
                      icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save),
                      label: const Text('Save patient locally'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _formatDate(DateTime date) {
  final year = date.year.toString().padLeft(4, '0');
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  return '$year-$month-$day';
}

class _EncounterRecordScreen extends StatefulWidget {
  const _EncounterRecordScreen({required this.assessment});

  final SafetyAssessment assessment;

  @override
  State<_EncounterRecordScreen> createState() => _EncounterRecordScreenState();
}

class _EncounterRecordScreenState extends State<_EncounterRecordScreen> {
  final _patientContextController = TextEditingController();
  final _noteController = TextEditingController();
  final _voiceNoteController = TextEditingController();
  final _temperatureController = TextEditingController();
  final _pulseController = TextEditingController();
  final _bloodPressureController = TextEditingController();
  final _respiratoryRateController = TextEditingController();
  final _oxygenSatController = TextEditingController();
  final _weightController = TextEditingController();
  String _action = 'note';
  bool _saving = false;

  @override
  void dispose() {
    _patientContextController.dispose();
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

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await saveEncounterCheck(
        assessment: widget.assessment,
        patientContext: _patientContextController.text.trim(),
        clinicianAction: _action,
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
      if (!mounted) return;
      showAppToast('Encounter saved locally');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      showAppToast('Failed to save encounter: $e');
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final assessment = widget.assessment;
    final actions = <({String value, String label, String body})>[
      (
        value: 'accept',
        label: 'Accept warning',
        body: 'The warning was clinically relevant and guided the final action.'
      ),
      (
        value: 'dismiss',
        label: 'Dismiss warning',
        body: 'The warning was reviewed but not followed for this encounter.'
      ),
      (
        value: 'note',
        label: 'Add note only',
        body: 'Record context without explicitly accepting or dismissing the warning.'
      ),
    ];
    final contextItems = <_MetricItem>[
      _MetricItem(label: 'Allergies', value: '${assessment.allergyNames.length}'),
      _MetricItem(label: 'Conditions', value: '${assessment.conditionNames.length}'),
      _MetricItem(label: 'Current meds', value: '${assessment.currentMedicationNames.length}'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Record encounter')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _PageHeader(
            eyebrow: 'Encounter',
            title: 'Save the treatment decision',
            body: 'Confirm what happened in this review. The note, warning outcome, and clinician action are written to local SQLite first and sync later.',
          ),
          const SizedBox(height: 16),
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Visit context'),
                const SizedBox(height: 10),
                Text(
                  'Capture the patient visit formally',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(
                  'This encounter keeps the patient context, treatment under review, safety result, clinician action, and optional transcript together in one local record.',
                  style: theme.textTheme.bodyLarge?.copyWith(height: 1.45),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _StatusPill(
                      label: assessment.medication.brandName,
                      foreground: theme.colorScheme.primary,
                    ),
                    if (assessment.medication.strengthText.isNotEmpty)
                      _StatusPill(
                        label: assessment.medication.strengthText,
                        foreground: theme.colorScheme.primary,
                      ),
                    if (assessment.medication.dosageForm.isNotEmpty)
                      _StatusPill(
                        label: assessment.medication.dosageForm,
                        foreground: theme.colorScheme.primary,
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                _ResponsiveMetricWrap(items: contextItems),
                const SizedBox(height: 14),
                if (assessment.allergyNames.isNotEmpty)
                  _CompactListBlock(
                    title: 'Allergies on file',
                    items: assessment.allergyNames,
                    icon: Icons.warning_amber_rounded,
                  ),
                if (assessment.allergyNames.isNotEmpty) const SizedBox(height: 12),
                if (assessment.conditionNames.isNotEmpty)
                  _CompactListBlock(
                    title: 'Conditions on file',
                    items: assessment.conditionNames,
                    icon: Icons.monitor_heart_outlined,
                  ),
                if (assessment.conditionNames.isNotEmpty) const SizedBox(height: 12),
                if (assessment.currentMedicationNames.isNotEmpty)
                  _CompactListBlock(
                    title: 'Current medications on file',
                    items: assessment.currentMedicationNames,
                    icon: Icons.medication_liquid_outlined,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Medication safety'),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        assessment.summary,
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    _OutcomeBadge(outcome: assessment.outcome),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'Safety result with reasoning',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                ...assessment.reasons.isEmpty
                    ? [
                        _InlineMessageCard(
                          icon: Icons.check_circle_outline,
                          title: 'No blocking risks found',
                          body: 'The local rules did not raise a red or amber safety match for this treatment.',
                          tone: const Color(0xFFD9ECDF),
                          foreground: const Color(0xFF027A48),
                        ),
                      ]
                    : assessment.reasons
                        .map((reason) => _ReasonCard(reason: reason))
                        .toList(growable: false),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Patient context'),
                const SizedBox(height: 10),
                Text(
                  'Presenting problem or visit context',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  'Capture why the patient is being seen and any details that frame this medication decision.',
                  style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _patientContextController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Patient context',
                    hintText: 'Presenting complaint, symptoms, or visit context.',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Clinician action'),
                const SizedBox(height: 10),
                Text(
                  'How was this recommendation handled?',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 14),
                ...actions.map(
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
              ],
            ),
          ),
          const SizedBox(height: 14),
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Encounter note'),
                const SizedBox(height: 10),
                Text(
                  'Record the clinical context',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  'Capture what was observed, what was given, or why the recommendation was accepted or dismissed.',
                  style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _noteController,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    labelText: 'Encounter note',
                    hintText: 'Add the treatment context, clinician judgment, or follow-up plan.',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Voice note'),
                const SizedBox(height: 10),
                Text(
                  'Voice note transcript',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  'Use this field for a transcribed voice note now. It is the placeholder for the voice-to-text engine.',
                  style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _voiceNoteController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Voice note transcript',
                    hintText: 'Paste or capture the clinician voice note transcript here.',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Optional vitals'),
                const SizedBox(height: 10),
                Text(
                  'Capture quick bedside measurements',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  'Use only the values you have. Empty fields stay out of the local encounter record.',
                  style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                ),
                const SizedBox(height: 12),
                _ResponsiveInputWrap(
                  fields: [
                    _InputFieldSpec(
                      label: 'Temperature',
                      hint: 'e.g. 38.2 C',
                      controller: _temperatureController,
                    ),
                    _InputFieldSpec(
                      label: 'Pulse',
                      hint: 'e.g. 92 bpm',
                      controller: _pulseController,
                    ),
                    _InputFieldSpec(
                      label: 'Blood pressure',
                      hint: 'e.g. 120/80',
                      controller: _bloodPressureController,
                    ),
                    _InputFieldSpec(
                      label: 'Respiratory rate',
                      hint: 'e.g. 18 /min',
                      controller: _respiratoryRateController,
                    ),
                    _InputFieldSpec(
                      label: 'Oxygen saturation',
                      hint: 'e.g. 97%',
                      controller: _oxygenSatController,
                    ),
                    _InputFieldSpec(
                      label: 'Weight',
                      hint: 'e.g. 63 kg',
                      controller: _weightController,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.offline_bolt_outlined, color: theme.colorScheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'This decision is saved on-device immediately. PowerSync uploads it when the device reconnects.',
                          style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _saving ? null : _save,
                    icon: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.save_outlined),
                    label: const Text('Save encounter locally'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OutcomeBadge extends StatelessWidget {
  const _OutcomeBadge({required this.outcome});

  final String outcome;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (outcome) {
      'do_not_give' => ('Do not give', const Color(0xFFB42318)),
      'use_caution' => ('Use caution', const Color(0xFFB54708)),
      'manual_review' => ('Manual review', const Color(0xFF1D5F74)),
      _ => ('Safe to consider', const Color(0xFF027A48)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _ContextChip extends StatelessWidget {
  const _ContextChip({
    required this.label,
    required this.icon,
    this.tone,
  });

  final String label;
  final IconData icon;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final color = tone ?? Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CockpitContextCard extends StatelessWidget {
  const _CockpitContextCard({
    required this.icon,
    required this.label,
    required this.title,
    required this.subtitle,
    required this.chips,
  });

  final IconData icon;
  final String label;
  final String title;
  final String subtitle;
  final List<Widget> chips;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: theme.colorScheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      title,
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if (subtitle.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (chips.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: chips,
            ),
          ],
        ],
      ),
    );
  }
}

class _AssessmentProgressCard extends StatelessWidget {
  const _AssessmentProgressCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _Panel(
      background: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Eyebrow('Processing'),
          const SizedBox(height: 10),
          Text(
            'Checking local safety rules',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'AidSync is reviewing allergies, conditions, pregnancy context, age, and known interaction rules from the local database.',
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
          ),
          const SizedBox(height: 14),
          const LinearProgressIndicator(minHeight: 4),
        ],
      ),
    );
  }
}

class _SeverityResultCard extends StatelessWidget {
  const _SeverityResultCard({required this.assessment});

  final SafetyAssessment assessment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (title, body, color, icon) = switch (assessment.outcome) {
      'do_not_give' => (
          'Do not give',
          'A blocking rule matched this patient and treatment. Do not proceed without manual review.',
          const Color(0xFFB42318),
          Icons.block,
        ),
      'use_caution' => (
          'Use caution',
          'An amber rule matched this treatment. Review the risks carefully before proceeding.',
          const Color(0xFFB54708),
          Icons.report_problem_outlined,
        ),
      'manual_review' => (
          'Manual review required',
          'The local reference set is incomplete or ambiguous for this treatment.',
          const Color(0xFF1D5F74),
          Icons.rule_folder_outlined,
        ),
      _ => (
          'Safe to consider',
          'No blocking rule was found in the local reference data for this patient and treatment.',
          const Color(0xFF027A48),
          Icons.check_circle_outline,
        ),
    };

    return _Panel(
      background: color.withValues(alpha: 0.10),
      borderColor: color.withValues(alpha: 0.22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Eyebrow('Zone C · severity result'),
          const SizedBox(height: 10),
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        color: color,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      assessment.summary,
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              _OutcomeBadge(outcome: assessment.outcome),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            body,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurface,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReasonAccordionPanel extends StatelessWidget {
  const _ReasonAccordionPanel({required this.assessment});

  final SafetyAssessment assessment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Eyebrow('Zone D · why'),
          const SizedBox(height: 10),
          Text(
            assessment.reasons.isEmpty ? 'No blocking risks found' : 'Why this result was returned',
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'Expand a reason to see exactly what local rule matched. This keeps the decision explainable during offline care.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.45,
            ),
          ),
          if (assessment.ingredientNames.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: assessment.ingredientNames
                  .map((item) => _ContextChip(label: item, icon: Icons.science_outlined))
                  .toList(growable: false),
            ),
          ],
          const SizedBox(height: 14),
          if (assessment.reasons.isEmpty)
            _InlineMessageCard(
              icon: Icons.check_circle_outline,
              title: 'No blocking risks found',
              body: 'The local rules did not raise a red or amber match for this patient and treatment.',
              tone: const Color(0xFFD9ECDF),
              foreground: const Color(0xFF027A48),
            )
          else
            ...assessment.reasons.map(
              (reason) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ReasonExpansionCard(reason: reason),
              ),
            ),
        ],
      ),
    );
  }
}

class _ReasonExpansionCard extends StatelessWidget {
  const _ReasonExpansionCard({required this.reason});

  final SafetyReason reason;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _severityColor(reason.severity);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        leading: Icon(Icons.rule_folder_outlined, color: color),
        collapsedIconColor: color,
        iconColor: color,
        title: Text(
          reason.title,
          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(
          _severityLabel(reason.severity),
          style: theme.textTheme.bodySmall?.copyWith(
            color: color,
            fontWeight: FontWeight.w700,
          ),
        ),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              reason.detail,
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckPersistenceBar extends StatelessWidget {
  const _CheckPersistenceBar({
    required this.assessment,
    required this.onSave,
  });

  final SafetyAssessment assessment;
  final Future<void> Function() onSave;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _Panel(
      background: theme.colorScheme.primary.withValues(alpha: 0.06),
      borderColor: theme.colorScheme.primary.withValues(alpha: 0.16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Eyebrow('Zone E + F · action and persistence'),
          const SizedBox(height: 10),
          Text(
            'Record the clinician action',
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'Save the result to the local encounter record first. PowerSync carries it back later.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _ContextChip(
                label: assessment.outcome == 'safe' ? 'Offline and ready' : 'Manual review preserved',
                icon: Icons.offline_pin_outlined,
                tone: theme.colorScheme.primary,
              ),
              const _ContextChip(
                label: 'Pending sync after save',
                icon: Icons.sync_outlined,
                tone: Color(0xFF4F7080),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: onSave,
              icon: const Icon(Icons.assignment_turned_in),
              label: const Text('Save result to encounter'),
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineMessageCard extends StatelessWidget {
  const _InlineMessageCard({
    required this.icon,
    required this.title,
    required this.body,
    required this.tone,
    required this.foreground,
  });

  final IconData icon;
  final String title;
  final String body;
  final Color tone;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: tone,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: foreground),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: foreground,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  body,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: foreground,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReasonCard extends StatelessWidget {
  const _ReasonCard({required this.reason});

  final SafetyReason reason;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _severityColor(reason.severity);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.20)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.report_gmailerrorred, size: 18, color: color),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  reason.title,
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            reason.detail,
            style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
          ),
        ],
      ),
    );
  }
}

class _ActionChoiceTile extends StatelessWidget {
  const _ActionChoiceTile({
    required this.label,
    required this.body,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String body;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final borderColor = selected
        ? theme.colorScheme.primary
        : Colors.black.withValues(alpha: 0.06);
    final background = selected
        ? theme.colorScheme.primary.withValues(alpha: 0.08)
        : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Ink(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              selected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: selected ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

List<String> _safeIngredients(Object? raw) {
  if (raw == null) return const [];
  if (raw is List) {
    return raw.map((item) => '$item').toList(growable: false);
  }
  try {
    final normalized = '$raw'.trim();
    if (!normalized.startsWith('[')) return const [];
    final parsed = jsonDecode(normalized);
    if (parsed is List) {
      return parsed.map((item) => '$item').toList(growable: false);
    }
  } catch (_) {}
  return const [];
}

Color _severityColor(String severity) {
  return switch (severity) {
    'red' || 'do_not_give' || 'high' => const Color(0xFFB42318),
    'yellow' || 'use_caution' || 'manual_review' || 'medium' => const Color(0xFFB54708),
    'green' || 'safe' => const Color(0xFF027A48),
    _ => const Color(0xFF1D5F74),
  };
}

String _severityLabel(String severity) {
  return switch (severity) {
    'red' || 'do_not_give' => 'Do not give',
    'yellow' || 'use_caution' => 'Use caution',
    'green' || 'safe' => 'Safe to consider',
    'manual_review' => 'Manual review',
    'high' => 'Do not give',
    'medium' => 'Use caution',
    _ => 'Review required',
  };
}

Color _patientRiskColor(PatientOption patient) {
  if (_isPregnancyStatus(patient.pregnancyStatus) || _isLactatingStatus(patient.pregnancyStatus)) {
    return const Color(0xFFB54708);
  }
  if (patient.ageYears != null && (patient.ageYears! <= 12 || patient.ageYears! >= 65)) {
    return const Color(0xFF1D5F74);
  }
  return const Color(0xFF027A48);
}

String _patientRiskSummary(PatientOption patient) {
  if (_isPregnancyStatus(patient.pregnancyStatus)) {
    return 'Pregnancy context';
  }
  if (_isLactatingStatus(patient.pregnancyStatus)) {
    return 'Lactation context';
  }
  if (patient.ageYears != null && patient.ageYears! <= 12) {
    return 'Pediatric review';
  }
  if (patient.ageYears != null && patient.ageYears! >= 65) {
    return 'Older adult review';
  }
  return 'Routine review';
}

List<String> _patientRiskTags(PatientOption patient) {
  final tags = <String>[];
  if (_isPregnancyStatus(patient.pregnancyStatus)) {
    tags.add('Pregnancy caution');
  }
  if (_isLactatingStatus(patient.pregnancyStatus)) {
    tags.add('Lactation caution');
  }
  if (patient.ageYears != null && patient.ageYears! <= 12) {
    tags.add('Paediatric review');
  }
  if (patient.ageYears != null && patient.ageYears! >= 65) {
    tags.add('Older adult review');
  }
  return tags;
}

String _formatRelativeTime(DateTime value) {
  final now = DateTime.now();
  final difference = now.difference(value);
  if (difference.inMinutes < 1) {
    return 'just now';
  }
  if (difference.inHours < 1) {
    return '${difference.inMinutes}m ago';
  }
  if (difference.inDays < 1) {
    return '${difference.inHours}h ago';
  }
  if (difference.inDays < 7) {
    return '${difference.inDays}d ago';
  }
  return _formatDate(value);
}

bool _isPregnancyStatus(String status) {
  final normalized = status.trim().toLowerCase();
  return normalized == 'pregnant';
}

bool _isLactatingStatus(String status) {
  final normalized = status.trim().toLowerCase();
  return normalized == 'lactating';
}

String _medicationSourceLabel(String sourceName) {
  final normalized = sourceName.trim().toLowerCase();
  return switch (normalized) {
    'custom_mobile_entry' => 'Custom local entry',
    '' => 'Local reference',
    _ => _formatLabel(sourceName),
  };
}

String _medicationAvailabilityLabel(MedicationOption medication) {
  final normalized = medication.sourceName.trim().toLowerCase();
  if (normalized == 'custom_mobile_entry') {
    return 'Custom local entry • manual review';
  }
  return 'Prepared online • available offline';
}

String _formatLabel(String value) {
  return value
      .replaceAll('_', ' ')
      .split(' ')
      .where((item) => item.isNotEmpty)
      .map((item) => '${item[0].toUpperCase()}${item.substring(1)}')
      .join(' ');
}
