import 'package:shared_preferences/shared_preferences.dart';

class PinLockService {
  static const _prefix = 'aidsync_mobile_pin_';

  static String _keyForUser(String userId) => '$_prefix$userId';

  static Future<bool> hasPin(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final pin = prefs.getString(_keyForUser(userId));
    return pin != null && pin.isNotEmpty;
  }

  static Future<void> savePin(String userId, String pin) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyForUser(userId), pin);
  }

  static Future<bool> verifyPin(String userId, String pin) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyForUser(userId)) == pin;
  }

  static Future<void> clearPin(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyForUser(userId));
  }
}
