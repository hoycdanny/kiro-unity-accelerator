/**
 * Test Suite Format Converter
 *
 * Converts between Unity Test Framework format and Cloud_Assist format.
 * Ensures round-trip fidelity: convertFromCloudFormat(convertToCloudFormat(x)) ≡ x
 *
 * Requirement: 4.6
 */

// ============================================================
// Unity Test Framework types
// ============================================================

export interface UnityTestCase {
  className: string;
  methodName: string;
  categories: string[];
}

export interface UnityTestSuite {
  suiteName: string;
  testCases: UnityTestCase[];
  platform: string;
  timeout: number;
}

// ============================================================
// Cloud_Assist types
// ============================================================

export interface CloudTest {
  id: string;
  name: string;
  tags: string[];
}

export interface CloudTestSuite {
  name: string;
  tests: CloudTest[];
  targetPlatform: string;
  timeoutSeconds: number;
  devicePool?: string;
}

// ============================================================
// Conversion functions
// ============================================================

/**
 * Convert a Unity Test Framework suite to Cloud_Assist format.
 */
export function convertToCloudFormat(unity: UnityTestSuite): CloudTestSuite {
  return {
    name: unity.suiteName,
    tests: unity.testCases.map((tc) => ({
      id: `${tc.className}.${tc.methodName}`,
      name: tc.methodName,
      tags: [...tc.categories],
    })),
    targetPlatform: unity.platform,
    timeoutSeconds: unity.timeout,
  };
}

/**
 * Convert a Cloud_Assist suite back to Unity Test Framework format.
 */
export function convertFromCloudFormat(cloud: CloudTestSuite): UnityTestSuite {
  return {
    suiteName: cloud.name,
    testCases: cloud.tests.map((t) => {
      const dotIndex = t.id.indexOf('.');
      const className = dotIndex >= 0 ? t.id.substring(0, dotIndex) : '';
      const methodName = dotIndex >= 0 ? t.id.substring(dotIndex + 1) : t.id;
      return {
        className,
        methodName,
        categories: [...t.tags],
      };
    }),
    platform: cloud.targetPlatform,
    timeout: cloud.timeoutSeconds,
  };
}
