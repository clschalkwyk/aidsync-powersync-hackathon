part of '../../main.dart';

class MobileShell extends StatefulWidget {
  const MobileShell({super.key});

  @override
  State<MobileShell> createState() => _MobileShellState();
}

class _MobileShellState extends State<MobileShell> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final pinController = TextEditingController();
  final confirmPinController = TextEditingController();

  StreamSubscription<AuthState>? _authSub;
  Session? _session;
  SyncSnapshot? _snapshot;
  bool _busy = false;
  String? _error;
  bool _restoredSession = false;
  bool _isUnlocked = false;
  bool? _hasPin;

  @override
  void initState() {
    super.initState();
    if (AppConfig.hasSyncConfig) {
      _session = Supabase.instance.client.auth.currentSession;
      _restoredSession = _session != null;
      _authSub = Supabase.instance.client.auth.onAuthStateChange.listen((event) {
        unawaited(_handleSessionChanged(event.session));
      });
    }
  }

  @override
  void dispose() {
    _authSub?.cancel();
    emailController.dispose();
    passwordController.dispose();
    pinController.dispose();
    confirmPinController.dispose();
    super.dispose();
  }

  Future<void> _handleSessionChanged(Session? session) async {
    setState(() {
      _session = session;
      _restoredSession = session != null;
      _error = null;
      _snapshot = session == null ? null : _snapshot;
      _isUnlocked = false;
      _hasPin = null;
    });

    if (session == null) {
      return;
    }

    final hasPin = await PinLockService.hasPin(session.user.id);
    if (!mounted) return;

    setState(() {
      _hasPin = hasPin;
      _isUnlocked = !hasPin;
    });

    if (!hasPin) {
      showAppToast('Set a device PIN to unlock AidSync offline');
      await _refreshSnapshotSilently();
      return;
    }

    await _refreshSnapshotSilently();
  }

  Future<void> _signIn() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: emailController.text.trim(),
        password: passwordController.text,
      );
      showAppToast('Signed in');
    } catch (e) {
      setState(() {
        _error = 'Sign-in failed: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  Future<void> _signOut() async {
    final userId = _session?.user.id;
    await Supabase.instance.client.auth.signOut();
    if (userId != null) {
      pinController.clear();
      confirmPinController.clear();
    }
    showAppToast('Signed out');
  }

  Future<void> _savePin() async {
    final session = _session;
    if (session == null) return;
    final pin = pinController.text.trim();
    final confirm = confirmPinController.text.trim();

    if (pin.length != 4 || int.tryParse(pin) == null) {
      setState(() {
        _error = 'Use a 4-digit PIN.';
      });
      return;
    }
    if (pin != confirm) {
      setState(() {
        _error = 'PIN confirmation does not match.';
      });
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    await PinLockService.savePin(session.user.id, pin);
    pinController.clear();
    confirmPinController.clear();
    if (!mounted) return;
    setState(() {
      _hasPin = true;
      _isUnlocked = true;
      _busy = false;
    });
    showAppToast('Device PIN saved');
  }

  Future<void> _unlockWithPin() async {
    final session = _session;
    if (session == null) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    final ok = await PinLockService.verifyPin(session.user.id, pinController.text.trim());
    if (!mounted) return;

    if (!ok) {
      setState(() {
        _busy = false;
        _error = 'Incorrect PIN.';
      });
      return;
    }

    pinController.clear();
    setState(() {
      _busy = false;
      _isUnlocked = true;
    });
    showAppToast('Unlocked for offline use');
    await _refreshSnapshotSilently();
  }

  Future<void> _resetPin() async {
    final session = _session;
    if (session == null) return;
    await PinLockService.clearPin(session.user.id);
    pinController.clear();
    confirmPinController.clear();
    if (!mounted) return;
    setState(() {
      _hasPin = false;
      _isUnlocked = false;
    });
    showAppToast('Device PIN cleared');
  }

  Future<void> _refreshSnapshot() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await initPowerSync();
      final snapshot = await loadSyncSnapshot();
      if (!mounted) return;
      setState(() {
        _snapshot = snapshot;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Sync failed: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  Future<void> _refreshSnapshotSilently() async {
    try {
      await initPowerSync();
      final snapshot = await loadSyncSnapshot();
      if (!mounted) return;
      setState(() {
        _snapshot = snapshot;
      });
    } catch (_) {
      // Keep offline shell available even if sync cannot update right now.
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;

    return Scaffold(
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: !AppConfig.hasSyncConfig
              ? _MissingConfigView(missing: AppConfig.missing)
              : session == null
                  ? _SignInView(
                      emailController: emailController,
                      passwordController: passwordController,
                      busy: _busy,
                      error: _error,
                      onSubmit: _signIn,
                    )
                  : _hasPin == null
                      ? const Center(child: CircularProgressIndicator())
                      : !_isUnlocked
                          ? _PinUnlockView(
                              hasPin: _hasPin!,
                              busy: _busy,
                              error: _error,
                              pinController: pinController,
                              confirmPinController: confirmPinController,
                              onUnlock: _unlockWithPin,
                              onSavePin: _savePin,
                              session: session,
                            )
                          : _MobileHomeView(
                              session: session,
                              snapshot: _snapshot,
                              busy: _busy,
                              restoredSession: _restoredSession,
                              error: _error,
                              onRefresh: _refreshSnapshot,
                              onSignOut: _signOut,
                              onResetPin: _resetPin,
                            ),
        ),
      ),
    );
  }
}

class _MissingConfigView extends StatelessWidget {
  const _MissingConfigView({required this.missing});

  final List<String> missing;

  @override
  Widget build(BuildContext context) {
    return _ScreenBackdrop(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: _Panel(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Runtime setup'),
                const SizedBox(height: 12),
                Text('AidSync Mobile needs sync config before it can start.', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 12),
                Text('Missing --dart-define values: ${missing.join(', ')}'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SignInView extends StatelessWidget {
  const _SignInView({
    required this.emailController,
    required this.passwordController,
    required this.busy,
    required this.error,
    required this.onSubmit,
  });

  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool busy;
  final String? error;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _ScreenBackdrop(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 24),
          _Panel(
            background: Colors.white.withValues(alpha: 0.94),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Field medication safety'),
                const SizedBox(height: 12),
                Text('AidSync Mobile', style: theme.textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                Text(
                  'Prepare medication reference data online. Use it offline during care sessions. Sync back when connectivity returns.',
                  style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password'),
                ),
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Text(error!, style: TextStyle(color: theme.colorScheme.error)),
                ],
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: busy ? null : onSubmit,
                    icon: busy
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.login),
                    label: const Text('Sign in and prepare offline access'),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'After the first online sign-in, the app can reopen with a local device PIN while offline.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
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

class _PinUnlockView extends StatelessWidget {
  const _PinUnlockView({
    required this.hasPin,
    required this.busy,
    required this.error,
    required this.pinController,
    required this.confirmPinController,
    required this.onUnlock,
    required this.onSavePin,
    required this.session,
  });

  final bool hasPin;
  final bool busy;
  final String? error;
  final TextEditingController pinController;
  final TextEditingController confirmPinController;
  final Future<void> Function() onUnlock;
  final Future<void> Function() onSavePin;
  final Session session;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = hasPin ? 'Unlock device access' : 'Create device PIN';
    final body = hasPin
        ? 'Use your local 4-digit PIN to unlock AidSync Mobile and continue working offline.'
        : 'Create a 4-digit device PIN for this clinician account. The app will use it for offline re-entry.';

    return _ScreenBackdrop(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: _Panel(
              background: Colors.white.withValues(alpha: 0.94),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _Eyebrow('Device unlock'),
                  const SizedBox(height: 12),
                  Text(title, style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Text(body, style: theme.textTheme.bodyLarge?.copyWith(height: 1.5)),
                  const SizedBox(height: 8),
                  Text(
                    'Signed in as ${session.user.email}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: pinController,
                    keyboardType: TextInputType.number,
                    obscureText: true,
                    maxLength: 4,
                    decoration: const InputDecoration(labelText: '4-digit PIN', counterText: ''),
                  ),
                  if (!hasPin) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: confirmPinController,
                      keyboardType: TextInputType.number,
                      obscureText: true,
                      maxLength: 4,
                      decoration: const InputDecoration(labelText: 'Confirm PIN', counterText: ''),
                    ),
                  ],
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: TextStyle(color: theme.colorScheme.error)),
                  ],
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: busy ? null : (hasPin ? onUnlock : onSavePin),
                      icon: busy
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Icon(hasPin ? Icons.lock_open : Icons.pin),
                      label: Text(hasPin ? 'Unlock local workspace' : 'Save device PIN'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MobileHomeView extends StatefulWidget {
  const _MobileHomeView({
    required this.session,
    required this.snapshot,
    required this.busy,
    required this.restoredSession,
    required this.error,
    required this.onRefresh,
    required this.onSignOut,
    required this.onResetPin,
  });

  final Session session;
  final SyncSnapshot? snapshot;
  final bool busy;
  final bool restoredSession;
  final String? error;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onSignOut;
  final Future<void> Function() onResetPin;

  @override
  State<_MobileHomeView> createState() => _MobileHomeViewState();
}

class _MobileHomeViewState extends State<_MobileHomeView> {
  int _tabIndex = 0;

  Future<void> _openMedicationReference() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const _MedicationCatalogScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<SyncStatus?>(
      valueListenable: syncStatusNotifier,
      builder: (context, status, _) {
        final pages = [
          _HomeScreen(
            session: widget.session,
            snapshot: widget.snapshot,
            busy: widget.busy,
            restoredSession: widget.restoredSession,
            error: widget.error,
            onRefresh: widget.onRefresh,
            onSignOut: widget.onSignOut,
            onResetPin: widget.onResetPin,
            status: status,
            onOpenPatients: () => setState(() => _tabIndex = 1),
            onOpenEncounters: () => setState(() => _tabIndex = 2),
            onOpenSync: () => setState(() => _tabIndex = 3),
            onOpenMedicationReference: _openMedicationReference,
          ),
          _PatientRecordsScreen(
            onChanged: widget.onRefresh,
          ),
          _EncountersScreen(
            onChanged: widget.onRefresh,
          ),
          _SyncScreen(
            onRefresh: widget.onRefresh,
          ),
        ];

        return Scaffold(
          extendBody: true,
          body: SafeArea(
            child: _ScreenBackdrop(
              child: pages[_tabIndex],
            ),
          ),
          bottomNavigationBar: Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.96),
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0E8AA8).withValues(alpha: 0.10),
                    blurRadius: 28,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: NavigationBar(
                  selectedIndex: _tabIndex,
                  destinations: const [
                    NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
                    NavigationDestination(icon: Icon(Icons.folder_shared_outlined), selectedIcon: Icon(Icons.folder_shared), label: 'Patients'),
                    NavigationDestination(icon: Icon(Icons.assignment_outlined), selectedIcon: Icon(Icons.assignment), label: 'Encounters'),
                    NavigationDestination(icon: Icon(Icons.sync_outlined), selectedIcon: Icon(Icons.sync), label: 'Sync'),
                  ],
                  onDestinationSelected: (index) => setState(() => _tabIndex = index),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _HomeScreen extends StatefulWidget {
  const _HomeScreen({
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
    required this.onOpenEncounters,
    required this.onOpenSync,
    required this.onOpenMedicationReference,
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
  final VoidCallback onOpenEncounters;
  final VoidCallback onOpenSync;
  final Future<void> Function() onOpenMedicationReference;

  @override
  State<_HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<_HomeScreen> {
  List<EncounterDraft> _encounters = const [];
  SyncStatusSummary? _syncSummary;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadHomeData());
  }

  Future<void> _loadHomeData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<Object>([
        loadEncounterDrafts(),
        loadSyncStatusSummary(),
      ]);
      if (!mounted) return;
      setState(() {
        _encounters = results[0] as List<EncounterDraft>;
        _syncSummary = results[1] as SyncStatusSummary;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load home state: $e';
      });
    }
  }

  Future<void> _openEncounter(String encounterId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _EncounterWorkspaceScreen(
          encounterId: encounterId,
          onChanged: widget.onRefresh,
        ),
      ),
    );
    await widget.onRefresh();
    await _loadHomeData();
  }

  Future<void> _openEncounterOrSummary(EncounterDraft encounter) async {
    if (encounter.status == 'completed') {
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => _EncounterHandoffSummaryScreen(encounterId: encounter.id),
        ),
      );
      await _loadHomeData();
      return;
    }
    await _openEncounter(encounter.id);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final counts = widget.snapshot?.counts ?? const <String, int>{};
    final activeDraft = _encounters.firstWhere(
      (item) => item.status == 'draft',
      orElse: () => EncounterDraft(
        id: '',
        patientId: '',
        patientName: '',
        status: '',
        presentingComplaint: null,
        clinicianNote: null,
        medicationChecksCount: 0,
        highestSeverity: null,
        pendingSync: false,
        createdAt: DateTime.fromMillisecondsSinceEpoch(0),
        updatedAt: DateTime.fromMillisecondsSinceEpoch(0),
      ),
    );
    final hasDraft = activeDraft.id.isNotEmpty;
    final riskyChecks = (widget.snapshot?.interactionChecks ?? const <Map<String, Object?>>[])
        .where((row) {
          final severity = '${row['severity'] ?? ''}'.toLowerCase();
          return severity == 'red' || severity == 'yellow';
        })
        .take(3)
        .toList(growable: false);
    final recentEncounters = _encounters.take(3).toList(growable: false);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        _HeroPanel(session: widget.session, buildLabel: appBuildLabel),
        const SizedBox(height: 16),
        _StatusBanner(
          status: widget.status,
          restoredSession: widget.restoredSession,
          snapshot: widget.snapshot,
        ),
        if (widget.error != null) ...[
          const SizedBox(height: 16),
          _InlineMessageCard(
            icon: Icons.error_outline,
            title: 'Sync session issue',
            body: widget.error!,
            tone: theme.colorScheme.errorContainer,
            foreground: theme.colorScheme.onErrorContainer,
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 16),
          _InlineMessageCard(
            icon: Icons.error_outline,
            title: 'Home unavailable',
            body: _error!,
            tone: theme.colorScheme.errorContainer,
            foreground: theme.colorScheme.onErrorContainer,
          ),
        ],
        const SizedBox(height: 16),
        _Panel(
          background: const Color(0xFFF7FBFC),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Eyebrow('Ready on this device'),
              const SizedBox(height: 10),
              Text(
                'Patient records and medication references are available offline',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 16),
              if (hasDraft)
                InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => _openEncounter(activeDraft.id),
                  child: Ink(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                activeDraft.patientName,
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Resume draft encounter • ${activeDraft.medicationChecksCount} medication checks • updated ${_formatRelativeTime(activeDraft.updatedAt)}',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                  height: 1.45,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _EncounterStatusBadge(
                          label: 'Resume',
                          color: theme.colorScheme.primary,
                        ),
                      ],
                    ),
                  ),
                )
              else
                _InlineMessageCard(
                  icon: Icons.assignment_outlined,
                  title: 'No draft encounter',
                  body: 'Open the patient queue to start a visit and add medication decisions.',
                  tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  foreground: theme.colorScheme.onSurface,
                ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: widget.onOpenPatients,
                  icon: const Icon(Icons.folder_shared_outlined),
                  label: const Text('Open patient queue'),
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: widget.onOpenSync,
                  icon: const Icon(Icons.sync_outlined),
                  label: const Text('View sync state'),
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
              const _Eyebrow('Readiness'),
              const SizedBox(height: 10),
              Text(
                'What is ready on this device',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 14),
              _ResponsiveMetricWrap(
                items: [
                  _MetricItem(label: 'Patients offline', value: '${counts['patients'] ?? 0}'),
                  _MetricItem(label: 'Medications offline', value: '${counts['medication_catalog'] ?? 0}'),
                  _MetricItem(
                    label: 'Pending sync',
                    value: '${_syncSummary?.uploadQueueCount ?? 0}',
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
              const _Eyebrow('Medication reference'),
              const SizedBox(height: 10),
              Text(
                'Local medication knowledge on this device',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                'Browse the prepared offline reference set before or during care. If a medicine is missing, add a custom local entry and continue with manual review.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 14),
              _ResponsiveMetricWrap(
                items: [
                  _MetricItem(
                    label: 'References on device',
                    value: '${counts['medication_catalog'] ?? 0}',
                  ),
                  _MetricItem(
                    label: 'Ingredients linked',
                    value: '${counts['medication_catalog_ingredients'] ?? 0}',
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    unawaited(widget.onOpenMedicationReference());
                  },
                  icon: const Icon(Icons.medication_outlined),
                  label: const Text('Browse medication reference'),
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
              const _Eyebrow('Recent risk checks'),
              const SizedBox(height: 10),
              Text(
                'Latest locally saved warnings',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (riskyChecks.isEmpty)
                _InlineMessageCard(
                  icon: Icons.assignment_turned_in_outlined,
                  title: 'No risky medication checks saved yet',
                  body: 'When a medication check returns caution or do not give, it will appear here as local encounter evidence.',
                  tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  foreground: theme.colorScheme.onSurface,
                )
              else
                ...riskyChecks.map(
                  (row) => _RecordRowCard(
                    icon: Icons.warning_amber_rounded,
                    text:
                        '${_severityLabel('${row['severity'] ?? ''}')} • ${row['result_status'] ?? 'warning'}\nAction: ${row['clinician_action'] ?? 'pending'}',
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
              const _Eyebrow('Recent encounter activity'),
              const SizedBox(height: 10),
              Text(
                'Latest encounter containers on this device',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (recentEncounters.isEmpty)
                _InlineMessageCard(
                  icon: Icons.assignment_outlined,
                  title: 'No encounter activity yet',
                  body: 'Start from the patient queue to create the first local encounter on this device.',
                  tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  foreground: theme.colorScheme.onSurface,
                )
              else
                ...recentEncounters.map(
                  (encounter) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _EncounterCard(
                      encounter: encounter,
                      onTap: () => _openEncounterOrSummary(encounter),
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
              Text('Device controls', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: widget.busy ? null : widget.onResetPin,
                      icon: const Icon(Icons.key),
                      label: const Text('Reset PIN'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: widget.busy ? null : widget.onSignOut,
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

class _EncountersScreen extends StatefulWidget {
  const _EncountersScreen({
    required this.onChanged,
  });

  final Future<void> Function() onChanged;

  @override
  State<_EncountersScreen> createState() => _EncountersScreenState();
}

class _EncountersScreenState extends State<_EncountersScreen> {
  List<EncounterDraft> _encounters = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadEncounters());
  }

  Future<void> _loadEncounters() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final encounters = await loadEncounterDrafts();
      if (!mounted) return;
      setState(() {
        _encounters = encounters;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load local encounters: $e';
      });
    }
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
    await _loadEncounters();
  }

  Future<void> _openSummary(String encounterId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _EncounterHandoffSummaryScreen(encounterId: encounterId),
      ),
    );
    await widget.onChanged();
    await _loadEncounters();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final active = _encounters.where((item) => item.status == 'draft').toList(growable: false);
    final completed = _encounters.where((item) => item.status != 'draft').toList(growable: false);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        const _PageHeader(
          eyebrow: 'Encounters',
          title: 'Local encounter containers',
          body: 'Each visit owns one patient context and can contain multiple medication safety decisions before finalizing.',
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
            title: 'Encounter list unavailable',
            body: _error!,
            tone: theme.colorScheme.errorContainer,
            foreground: theme.colorScheme.onErrorContainer,
          )
        else ...[
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Active drafts'),
                const SizedBox(height: 10),
                Text(
                  'Resume encounter work',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                if (active.isEmpty)
                  _InlineMessageCard(
                    icon: Icons.assignment_outlined,
                    title: 'No active drafts',
                    body: 'Start from a patient record to create an encounter and add medication checks.',
                    tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                    foreground: theme.colorScheme.onSurface,
                  )
                else
                  ...active.map(
                    (encounter) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _EncounterCard(
                        encounter: encounter,
                        onTap: () => _openEncounter(encounter.id),
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
                const _Eyebrow('Completed'),
                const SizedBox(height: 10),
                Text(
                  'Recent finalized encounters',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                if (completed.isEmpty)
                  _InlineMessageCard(
                    icon: Icons.history_toggle_off,
                    title: 'No completed encounters yet',
                    body: 'Finalize a draft encounter after saving the medication decisions that belong to that visit.',
                    tone: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                    foreground: theme.colorScheme.onSurface,
                  )
                else
                  ...completed.take(8).map(
                    (encounter) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _EncounterCard(
                        encounter: encounter,
                        onTap: () => _openSummary(encounter.id),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _SyncScreen extends StatefulWidget {
  const _SyncScreen({
    required this.onRefresh,
  });

  final Future<void> Function() onRefresh;

  @override
  State<_SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<_SyncScreen> {
  SyncStatusSummary? _summary;
  bool _loading = true;
  bool _retrying = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadSyncData());
  }

  Future<void> _loadSyncData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final summary = await loadSyncStatusSummary();
      if (!mounted) return;
      setState(() {
        _summary = summary;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load sync status: $e';
      });
    }
  }

  Future<void> _retrySync() async {
    setState(() => _retrying = true);
    try {
      await retryPowerSyncConnection();
      await widget.onRefresh();
      await _loadSyncData();
      if (!mounted) return;
      showAppToast('Sync retry requested');
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Failed to retry sync: $e');
    } finally {
      if (mounted) {
        setState(() => _retrying = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final summary = _summary;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        const _PageHeader(
          eyebrow: 'Sync',
          title: 'Offline-first proof',
          body: 'Sync state should remain visible and credible without turning the app into a noisy technical console.',
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
            title: 'Sync status unavailable',
            body: _error!,
            tone: theme.colorScheme.errorContainer,
            foreground: theme.colorScheme.onErrorContainer,
          )
        else if (summary != null) ...[
          _Panel(
            background: summary.connected
                ? const Color(0xFFE7F5F0)
                : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.7),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Eyebrow('Current state'),
                const SizedBox(height: 10),
                Text(
                  summary.connected ? 'Connected and ready' : 'Working offline',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(
                  summary.connected
                      ? 'PowerSync is connected. Local encounter work continues without waiting for the backend.'
                      : 'The device can keep recording encounters locally. Sync resumes when connectivity returns.',
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
                    _StatusPill(
                      label: summary.connected ? 'Connected' : 'Offline ready',
                      foreground: summary.connected
                          ? const Color(0xFF027A48)
                          : theme.colorScheme.primary,
                    ),
                    _StatusPill(
                      label: summary.lastSyncedAt == null
                          ? 'No completed sync yet'
                          : 'Last sync ${_formatRelativeTime(summary.lastSyncedAt!)}',
                      foreground: theme.colorScheme.primary,
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
                const _Eyebrow('Pending items'),
                const SizedBox(height: 10),
                Text(
                  'What still needs to upload',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 14),
                _ResponsiveMetricWrap(
                  items: [
                    _MetricItem(label: 'Draft encounters', value: '${summary.pendingEncounterCount}'),
                    _MetricItem(label: 'Medication checks', value: '${summary.pendingMedicationChecksCount}'),
                    _MetricItem(label: 'Upload queue', value: '${summary.uploadQueueCount}'),
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
                const _Eyebrow('Recent sync errors'),
                const SizedBox(height: 10),
                Text(
                  'Only show the errors that matter',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                if ((summary.error ?? '').trim().isEmpty)
                  _InlineMessageCard(
                    icon: Icons.check_circle_outline,
                    title: 'No active sync error',
                    body: 'The sync pipeline is currently healthy from the device perspective.',
                    tone: const Color(0xFFD9ECDF),
                    foreground: const Color(0xFF027A48),
                  )
                else
                  _InlineMessageCard(
                    icon: Icons.sync_problem_outlined,
                    title: 'Sync needs attention',
                    body: summary.error!,
                    tone: theme.colorScheme.errorContainer,
                    foreground: theme.colorScheme.onErrorContainer,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _retrying ? null : _retrySync,
              icon: _retrying
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.sync),
              label: const Text('Retry sync'),
            ),
          ),
        ],
      ],
    );
  }
}

