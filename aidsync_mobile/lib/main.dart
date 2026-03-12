import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:logging/logging.dart';
import 'package:powersync/powersync.dart' show SyncStatus;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_globals.dart';
import 'pin_lock_service.dart';
import 'powersync_service.dart';

const appBuildLabel = String.fromEnvironment(
  'APP_BUILD_LABEL',
  defaultValue: 'aidsync-mobile-1',
);

final startupLog = Logger('aidsync-mobile-startup');

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  _configureLogging();
  startupLog.info('AidSync Mobile startup build=$appBuildLabel');
  startupLog.info('Sync config present=${AppConfig.hasSyncConfig}');
  if (!AppConfig.hasSyncConfig) {
    startupLog.warning('Missing config: ${AppConfig.missing.join(', ')}');
  }

  await initializeSupabaseIfConfigured();
  runApp(const AidSyncMobileApp());
}

void _configureLogging() {
  Logger.root.level = Level.ALL;
  Logger.root.onRecord.listen((record) {
    final error = record.error == null ? '' : ' error=${record.error}';
    debugPrint('[${record.level.name}] ${record.loggerName}: ${record.message}$error');
  });
}

class AidSyncMobileApp extends StatelessWidget {
  const AidSyncMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    const canvas = Color(0xFFF4F1E8);
    const ink = Color(0xFF17313B);
    const teal = Color(0xFF1D5F74);
    const clay = Color(0xFFC96E4B);
    const olive = Color(0xFF6F7B5B);

    final colorScheme = ColorScheme.fromSeed(
      seedColor: teal,
      brightness: Brightness.light,
      primary: teal,
      secondary: clay,
      tertiary: olive,
      surface: Colors.white,
      surfaceContainerHighest: const Color(0xFFE7E2D6),
    );

    return MaterialApp(
      title: 'AidSync Mobile',
      scaffoldMessengerKey: rootScaffoldMessengerKey,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: canvas,
        textTheme: ThemeData.light().textTheme.apply(
              bodyColor: ink,
              displayColor: ink,
            ),
        cardTheme: const CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(24)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide(color: colorScheme.outlineVariant),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide(color: colorScheme.outlineVariant),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: BorderSide(color: colorScheme.primary, width: 1.4),
          ),
        ),
      ),
      home: const MobileShell(),
    );
  }
}

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
      unawaited(_handleSessionChanged(_session));
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
    return Padding(
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
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF4F1E8), Color(0xFFE4ECDD), Color(0xFFD8E8EB)],
        ),
      ),
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 24),
          _Panel(
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
                const Text('After the first online sign-in, the app can reopen with a local device PIN while offline.'),
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

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: _Panel(
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
                Text('Signed in as ${session.user.email}', style: theme.textTheme.bodyMedium),
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

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<SyncStatus?>(
      valueListenable: syncStatusNotifier,
      builder: (context, status, _) {
        final pages = [
          _OverviewScreen(
            session: widget.session,
            snapshot: widget.snapshot,
            busy: widget.busy,
            restoredSession: widget.restoredSession,
            error: widget.error,
            onRefresh: widget.onRefresh,
            onSignOut: widget.onSignOut,
            onResetPin: widget.onResetPin,
            status: status,
          ),
          _PatientRecordsScreen(onChanged: widget.onRefresh),
          _MedicationCheckScreen(onChanged: widget.onRefresh),
        ];

        return Scaffold(
          body: SafeArea(child: pages[_tabIndex]),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tabIndex,
            destinations: const [
              NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
              NavigationDestination(icon: Icon(Icons.folder_shared_outlined), selectedIcon: Icon(Icons.folder_shared), label: 'Patients'),
              NavigationDestination(icon: Icon(Icons.health_and_safety_outlined), selectedIcon: Icon(Icons.health_and_safety), label: 'Check'),
            ],
            onDestinationSelected: (index) => setState(() => _tabIndex = index),
          ),
        );
      },
    );
  }
}

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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final counts = snapshot?.counts ?? const <String, int>{};
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
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: busy ? null : onRefresh,
                icon: const Icon(Icons.sync),
                label: const Text('Sync now'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: busy ? null : onResetPin,
                icon: const Icon(Icons.key),
                label: const Text('Reset PIN'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextButton.icon(
          onPressed: busy ? null : onSignOut,
          icon: const Icon(Icons.logout),
          label: const Text('Sign out'),
        ),
        const SizedBox(height: 16),
        _StatsGrid(counts: counts),
        const SizedBox(height: 16),
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Eyebrow('Field workflow'),
              const SizedBox(height: 10),
              Text('Prepare online. Check offline. Sync back later.', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              const Text('1. Open a synced patient file\n2. Choose a medication from local reference data\n3. Review reasons before treatment\n4. Record encounter actions and sync back when connected'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _SectionList(
          title: 'Medication reference on device',
          subtitle: 'Data prepared online and synced to local SQLite.',
          rows: snapshot?.medications ?? const [],
          rowBuilder: (row) => '${row['brand_name'] ?? 'Unknown'} • ${row['strength_text'] ?? ''} ${row['dosage_form'] ?? ''}',
        ),
        const SizedBox(height: 16),
        _SectionList(
          title: 'Recent medication checks',
          subtitle: 'Latest safety outcomes waiting to sync or already synced.',
          rows: snapshot?.interactionChecks ?? const [],
          rowBuilder: (row) => '${row['severity'] ?? 'unknown'} • ${row['result_status'] ?? ''} • ${row['clinician_action'] ?? ''}',
        ),
      ],
    );
  }
}

class _PatientRecordsScreen extends StatefulWidget {
  const _PatientRecordsScreen({required this.onChanged});

  final Future<void> Function() onChanged;

  @override
  State<_PatientRecordsScreen> createState() => _PatientRecordsScreenState();
}

class _PatientRecordsScreenState extends State<_PatientRecordsScreen> {
  List<PatientOption> _patients = const [];
  PatientRecordDetail? _detail;
  String? _selectedPatientId;
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
        _selectedPatientId = patients.isNotEmpty ? patients.first.id : null;
        _loading = false;
      });
      if (_selectedPatientId != null) {
        await _loadDetail(_selectedPatientId!);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to load patient records: $e';
      });
    }
  }

  Future<void> _loadDetail(String patientId) async {
    try {
      final detail = await loadPatientRecordDetail(patientId);
      if (!mounted) return;
      setState(() {
        _selectedPatientId = patientId;
        _detail = detail;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load patient detail: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        const _PageHeader(
          eyebrow: 'Patient records',
          title: 'Local patient files',
          body: 'Review allergies, conditions, and current medications from synced local SQLite data.',
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
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
          label: const Text('Add patient locally'),
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: CircularProgressIndicator(),
          ))
        else ...[
          _Panel(
            child: DropdownButtonFormField<String>(
              initialValue: _selectedPatientId,
              items: _patients
                  .map((item) => DropdownMenuItem<String>(
                        value: item.id,
                        child: Text('${item.fullName}${item.ageYears == null ? '' : ' • ${item.ageYears}y'}'),
                      ))
                  .toList(growable: false),
              onChanged: (value) {
                if (value != null) {
                  unawaited(_loadDetail(value));
                }
              },
              decoration: const InputDecoration(labelText: 'Select patient'),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
          ],
          if (_detail != null) ...[
            const SizedBox(height: 16),
            _Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_detail!.patient.fullName, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      Chip(label: Text(_detail!.patient.sex.isEmpty ? 'Sex unknown' : _detail!.patient.sex)),
                      Chip(label: Text(_detail!.patient.ageYears == null ? 'Age unknown' : '${_detail!.patient.ageYears} years')),
                      Chip(label: Text(_detail!.patient.pregnancyStatus.isEmpty ? 'Pregnancy unknown' : _detail!.patient.pregnancyStatus)),
                      if (_detail!.patient.locationText.isNotEmpty) Chip(label: Text(_detail!.patient.locationText)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _RecordSection(
              title: 'Allergies',
              empty: 'No allergies synced for this patient.',
              rows: _detail!.allergies,
              rowBuilder: (row) => '${row['allergen_name'] ?? ''}${('${row['severity'] ?? ''}').isEmpty ? '' : ' • ${row['severity']}'}${('${row['notes'] ?? ''}').isEmpty ? '' : '\n${row['notes']}'}',
            ),
            const SizedBox(height: 16),
            _RecordSection(
              title: 'Conditions',
              empty: 'No conditions synced for this patient.',
              rows: _detail!.conditions,
              rowBuilder: (row) => '${row['condition_name'] ?? ''}${('${row['notes'] ?? ''}').isEmpty ? '' : '\n${row['notes']}'}',
            ),
            const SizedBox(height: 16),
            _RecordSection(
              title: 'Current medications',
              empty: 'No current medications synced for this patient.',
              rows: _detail!.currentMedications,
              rowBuilder: (row) {
                final ingredients = _safeIngredients(row['active_ingredients_json']);
                return '${row['med_name'] ?? ''}${ingredients.isEmpty ? '' : '\nIngredients: ${ingredients.join(', ')}'}${('${row['dose_text'] ?? ''}').isEmpty ? '' : '\nDose: ${row['dose_text']}'}';
              },
            ),
          ],
        ],
      ],
    );
  }
}

class _MedicationCheckScreen extends StatelessWidget {
  const _MedicationCheckScreen({required this.onChanged});

  final Future<void> Function() onChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        const _PageHeader(
          eyebrow: 'Medication check',
          title: 'Offline suitability review',
          body: 'Pick a patient and medication from local data, then review deterministic warnings before treatment.',
        ),
        SizedBox(height: 16),
        _MedicationCheckPanel(onEncounterSaved: onChanged),
      ],
    );
  }
}

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

class _RecordSection extends StatelessWidget {
  const _RecordSection({
    required this.title,
    required this.empty,
    required this.rows,
    required this.rowBuilder,
  });

  final String title;
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
          Text(title, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          if (rows.isEmpty)
            Text(empty)
          else
            ...rows.map((row) => Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Text(rowBuilder(row), style: theme.textTheme.bodyMedium?.copyWith(height: 1.45)),
                )),
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
          colors: [Color(0xFF17313B), Color(0xFF1D5F74)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('AidSync Mobile', style: theme.textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(
            'Offline-first medication safety for field clinicians.',
            style: theme.textTheme.bodyLarge?.copyWith(color: Colors.white.withValues(alpha: 0.88), height: 1.5),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _ChipTag(label: session.user.email ?? 'Unknown user'),
              _ChipTag(label: buildLabel),
              const _ChipTag(label: 'Local SQLite + PowerSync'),
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
                  const SizedBox(height: 8),
                  Text(
                    'Client ${snapshot!.clientId} • Streams: ${snapshot!.streams.join(', ')}',
                    style: theme.textTheme.bodySmall?.copyWith(color: fg.withValues(alpha: 0.85)),
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

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.counts});

  final Map<String, int> counts;

  @override
  Widget build(BuildContext context) {
    final items = <({String label, int value, IconData icon, Color tone})>[
      (label: 'Patients', value: counts['patients'] ?? 0, icon: Icons.people_alt_outlined, tone: const Color(0xFF1D5F74)),
      (label: 'Medications', value: counts['medication_catalog'] ?? 0, icon: Icons.medication_outlined, tone: const Color(0xFFC96E4B)),
      (label: 'Ingredients', value: counts['active_ingredients'] ?? 0, icon: Icons.science_outlined, tone: const Color(0xFF6F7B5B)),
      (label: 'Checks', value: counts['interaction_checks'] ?? 0, icon: Icons.rule_folder_outlined, tone: const Color(0xFF7A5469)),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.3,
      ),
      itemBuilder: (context, index) {
        final item = items[index];
        return _Panel(
          background: item.tone.withValues(alpha: 0.10),
          borderColor: item.tone.withValues(alpha: 0.20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(item.icon, color: item.tone),
              const Spacer(),
              Text('${item.value}', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(item.label),
            ],
          ),
        );
      },
    );
  }
}

class _SectionList extends StatelessWidget {
  const _SectionList({
    required this.title,
    required this.subtitle,
    required this.rows,
    required this.rowBuilder,
  });

  final String title;
  final String subtitle;
  final List<Map<String, Object?>> rows;
  final String Function(Map<String, Object?> row) rowBuilder;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(subtitle, style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5)),
          const SizedBox(height: 16),
          if (rows.isEmpty)
            const Text('No rows synced yet.')
          else
            ...rows.map(
              (row) => Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(rowBuilder(row), style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.45)),
              ),
            ),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({
    required this.child,
    this.background = Colors.white,
    this.borderColor,
  });

  final Widget child;
  final Color background;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderColor ?? Colors.black.withValues(alpha: 0.04)),
      ),
      child: child,
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
  const _MedicationCheckPanel({required this.onEncounterSaved});

  final Future<void> Function() onEncounterSaved;

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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final assessment = _assessment;
    final tone = switch (assessment?.outcome) {
      'do_not_give' => theme.colorScheme.errorContainer,
      'use_caution' => const Color(0xFFF4E0B8),
      'manual_review' => theme.colorScheme.tertiaryContainer,
      'safe' => const Color(0xFFD9ECDF),
      _ => Colors.white,
    };

    return _Panel(
      background: tone,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _Eyebrow('Offline check'),
                    const SizedBox(height: 8),
                    Text(
                      'Patient + medication suitability',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Use synced local patient data and medication reference rules to support care decisions offline.',
                      style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: _loading ? null : _loadOptions,
                icon: const Icon(Icons.refresh),
                tooltip: 'Reload local options',
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Center(child: Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: CircularProgressIndicator(),
            ))
          else ...[
            DropdownButtonFormField<String>(
              initialValue: _selectedPatientId,
              items: _patients
                  .map(
                    (item) => DropdownMenuItem<String>(
                      value: item.id,
                      child: Text('${item.fullName}${item.ageYears == null ? '' : ' • ${item.ageYears}y'}'),
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
                      child: Text('${item.brandName}${item.strengthText.isEmpty ? '' : ' • ${item.strengthText}'}'),
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
            const SizedBox(height: 16),
            if (_evaluating)
              const LinearProgressIndicator(minHeight: 3),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
            ],
            if (assessment != null) ...[
              const SizedBox(height: 16),
              _OutcomeBadge(outcome: assessment.outcome),
              const SizedBox(height: 12),
              Text(
                assessment.summary,
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 10),
              Text(
                '${assessment.medication.brandName} • ${assessment.medication.strengthText} ${assessment.medication.dosageForm}'.trim(),
                style: theme.textTheme.bodyMedium,
              ),
              if (assessment.ingredientNames.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: assessment.ingredientNames
                      .map((item) => Chip(label: Text(item)))
                      .toList(growable: false),
                ),
              ],
              const SizedBox(height: 14),
              if (assessment.reasons.isEmpty)
                const Text('No blocking risks found in the locally synced rules.')
              else
                ...assessment.reasons.map(
                  (reason) => Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: _severityColor(reason.severity).withValues(alpha: 0.20)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.report_gmailerrorred, size: 18, color: _severityColor(reason.severity)),
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
                        Text(reason.detail, style: theme.textTheme.bodyMedium?.copyWith(height: 1.45)),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () async {
                    final saved = await Navigator.of(context).push<bool>(
                      MaterialPageRoute(
                        builder: (_) => _EncounterRecordScreen(assessment: assessment),
                      ),
                    );
                    if (saved == true) {
                      await widget.onEncounterSaved();
                    }
                  },
                  icon: const Icon(Icons.assignment_turned_in),
                  label: const Text('Record encounter locally'),
                ),
              ),
            ],
          ],
        ],
      ),
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
    return Scaffold(
      appBar: AppBar(title: const Text('New patient')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const _PageHeader(
            eyebrow: 'Patient entry',
            title: 'Create patient locally',
            body: 'This record is stored in local SQLite first and synced back when connectivity is available.',
          ),
          const SizedBox(height: 16),
          _Panel(
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Full name'),
                    validator: (value) => (value == null || value.trim().isEmpty) ? 'Full name is required.' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _dobController,
                    decoration: const InputDecoration(labelText: 'Date of birth (YYYY-MM-DD)'),
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
                    onChanged: (value) => setState(() => _sex = value ?? _sex),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _pregnancyStatus,
                    decoration: const InputDecoration(labelText: 'Pregnancy status'),
                    items: const [
                      DropdownMenuItem(value: 'not_pregnant', child: Text('Not pregnant')),
                      DropdownMenuItem(value: 'pregnant', child: Text('Pregnant')),
                      DropdownMenuItem(value: 'lactating', child: Text('Lactating')),
                      DropdownMenuItem(value: 'unknown', child: Text('Unknown')),
                    ],
                    onChanged: (value) => setState(() => _pregnancyStatus = value ?? _pregnancyStatus),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _locationController,
                    decoration: const InputDecoration(labelText: 'Location'),
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

class _EncounterRecordScreen extends StatefulWidget {
  const _EncounterRecordScreen({required this.assessment});

  final SafetyAssessment assessment;

  @override
  State<_EncounterRecordScreen> createState() => _EncounterRecordScreenState();
}

class _EncounterRecordScreenState extends State<_EncounterRecordScreen> {
  final _noteController = TextEditingController();
  String _action = 'note';
  bool _saving = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await saveEncounterCheck(
        assessment: widget.assessment,
        clinicianAction: _action,
        clinicianNote: _noteController.text.trim(),
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
    return Scaffold(
      appBar: AppBar(title: const Text('Record encounter')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _PageHeader(
            eyebrow: 'Encounter',
            title: 'Save local medication check',
            body: 'Record the clinician action and note. This will be written locally first and uploaded by PowerSync when possible.',
          ),
          const SizedBox(height: 16),
          _Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.assessment.patient.fullName),
                const SizedBox(height: 6),
                Text('${widget.assessment.medication.brandName} • ${widget.assessment.summary}'),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _action,
                  decoration: const InputDecoration(labelText: 'Clinician action'),
                  items: const [
                    DropdownMenuItem(value: 'accept', child: Text('Accept warning')),
                    DropdownMenuItem(value: 'dismiss', child: Text('Dismiss warning')),
                    DropdownMenuItem(value: 'note', child: Text('Add note only')),
                  ],
                  onChanged: (value) => setState(() => _action = value ?? _action),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _noteController,
                  maxLines: 5,
                  decoration: const InputDecoration(labelText: 'Encounter note'),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _saving ? null : _save,
                    icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.cloud_upload),
                    label: const Text('Save to local queue'),
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
    'high' => const Color(0xFFB42318),
    'medium' => const Color(0xFFB54708),
    _ => const Color(0xFF1D5F74),
  };
}
