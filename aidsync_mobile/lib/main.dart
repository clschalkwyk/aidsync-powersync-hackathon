import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:logging/logging.dart';
import 'package:powersync/powersync.dart' show SyncStatus;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_globals.dart';
import 'pin_lock_service.dart';
import 'powersync_service.dart';

part 'src/mobile/shell_home.dart';
part 'src/mobile/encounter_flow.dart';
part 'src/mobile/patient_reference_flow.dart';
part 'src/mobile/shared_widgets.dart';

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
    const canvas = Color(0xFFF2F7F7);
    const ink = Color(0xFF123644);
    const teal = Color(0xFF0E8AA8);
    const clay = Color(0xFF2C6A78);
    const olive = Color(0xFF0F8A6C);

    final colorScheme = ColorScheme.fromSeed(
      seedColor: teal,
      brightness: Brightness.light,
      primary: teal,
      secondary: clay,
      tertiary: olive,
      surface: Colors.white,
      surfaceContainerHighest: const Color(0xFFDDF0F3),
    );

    return MaterialApp(
      title: 'AidSync Mobile',
      scaffoldMessengerKey: rootScaffoldMessengerKey,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: canvas,
        textTheme: ThemeData.light().textTheme
            .apply(
              bodyColor: ink,
              displayColor: ink,
            )
            .copyWith(
              headlineMedium: const TextStyle(fontSize: 30, fontWeight: FontWeight.w700, height: 1.08),
              headlineSmall: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, height: 1.12),
              titleLarge: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, height: 1.18),
              titleMedium: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, height: 1.22),
              titleSmall: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, height: 1.26),
              bodyLarge: const TextStyle(fontSize: 16, height: 1.5),
              bodyMedium: const TextStyle(fontSize: 14, height: 1.5),
              bodySmall: const TextStyle(fontSize: 12.5, height: 1.45),
              labelLarge: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: 0.1),
              labelMedium: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.2),
            ),
        cardTheme: const CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(24)),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
          centerTitle: false,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          labelStyle: TextStyle(color: colorScheme.onSurfaceVariant),
          hintStyle: TextStyle(color: colorScheme.onSurfaceVariant.withValues(alpha: 0.8)),
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
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            side: BorderSide(color: colorScheme.outlineVariant),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
          selectedColor: colorScheme.primary.withValues(alpha: 0.12),
          side: BorderSide(color: colorScheme.outlineVariant.withValues(alpha: 0.5)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          labelStyle: TextStyle(color: colorScheme.onSurface, fontWeight: FontWeight.w600),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: colorScheme.primary.withValues(alpha: 0.12),
          elevation: 0,
          iconTheme: WidgetStateProperty.resolveWith(
            (states) => IconThemeData(
              color: states.contains(WidgetState.selected)
                  ? colorScheme.primary
                  : colorScheme.onSurfaceVariant,
            ),
          ),
          labelTextStyle: WidgetStateProperty.resolveWith(
            (states) => TextStyle(
              fontSize: 12,
              fontWeight: states.contains(WidgetState.selected)
                  ? FontWeight.w700
                  : FontWeight.w600,
              color: states.contains(WidgetState.selected)
                  ? colorScheme.primary
                  : colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
      home: const MobileShell(),
    );
  }
}
