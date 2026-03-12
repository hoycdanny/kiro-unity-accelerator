/**
 * Test Result Formatter
 *
 * Structures raw cross-platform test results into a per-platform report
 * with pass rates, failure lists, and device failure markers with logs.
 *
 * Requirements: 4.2, 4.5
 */

// ============================================================
// Types
// ============================================================

export interface RawTestCaseResult {
  testName: string;
  passed: boolean;
  message?: string;
  stackTrace?: string;
  screenshot?: string;
}

export interface RawDeviceResult {
  deviceName: string;
  testResults: RawTestCaseResult[];
}

export interface RawPlatformResult {
  platform: string;
  devices: RawDeviceResult[];
}

export interface FailedTestCase {
  testName: string;
  message: string;
  stackTrace?: string;
  screenshot?: string;
}

export interface DeviceReport {
  deviceName: string;
  passRate: number;
  totalTests: number;
  passedTests: number;
  failed: boolean;
  failedTests: FailedTestCase[];
}

export interface PlatformReport {
  platform: string;
  passRate: number;
  totalTests: number;
  passedTests: number;
  devices: DeviceReport[];
  failedTests: FailedTestCase[];
}

export interface FormattedTestResults {
  platforms: PlatformReport[];
}

// ============================================================
// Formatter
// ============================================================

/**
 * Format raw cross-platform test results into structured reports.
 *
 * Each platform report contains an aggregate pass rate, a list of
 * failed test cases, and per-device breakdowns. Devices with any
 * failure are marked `failed: true` and carry the failure logs.
 */
export function formatTestResults(
  rawResults: RawPlatformResult[],
): FormattedTestResults {
  const platforms: PlatformReport[] = rawResults.map((raw) => {
    const devices: DeviceReport[] = raw.devices.map((dev) => {
      const total = dev.testResults.length;
      const passed = dev.testResults.filter((r) => r.passed).length;
      const failedTests: FailedTestCase[] = dev.testResults
        .filter((r) => !r.passed)
        .map((r) => ({
          testName: r.testName,
          message: r.message ?? 'Unknown failure',
          stackTrace: r.stackTrace,
          screenshot: r.screenshot,
        }));

      return {
        deviceName: dev.deviceName,
        passRate: total === 0 ? 100 : (passed / total) * 100,
        totalTests: total,
        passedTests: passed,
        failed: failedTests.length > 0,
        failedTests,
      };
    });

    // Aggregate across all devices for this platform
    const totalTests = devices.reduce((s, d) => s + d.totalTests, 0);
    const passedTests = devices.reduce((s, d) => s + d.passedTests, 0);
    const allFailedTests = devices.flatMap((d) => d.failedTests);

    return {
      platform: raw.platform,
      passRate: totalTests === 0 ? 100 : (passedTests / totalTests) * 100,
      totalTests,
      passedTests,
      devices,
      failedTests: allFailedTests,
    };
  });

  return { platforms };
}
