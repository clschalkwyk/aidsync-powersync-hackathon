import 'package:flutter_test/flutter_test.dart';

import 'package:aidsync_mobile/main.dart';

void main() {
  testWidgets('renders aidsync mobile shell', (WidgetTester tester) async {
    await tester.pumpWidget(const AidSyncMobileApp());

    expect(find.text('AidSync Mobile'), findsOneWidget);
  });
}
