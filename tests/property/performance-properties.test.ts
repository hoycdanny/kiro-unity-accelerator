import * as fc from 'fast-check';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PerformanceThresholds } from '../../src/types';
import { saveThresholds, loadThresholds } from '../../src/threshold-persistence';
import { DEFAULT_THRESHOLDS } from '../../src/performance-report';

// Helper: arbitrary for ThresholdRange
const thresholdRangeArb = fc.record({
  warning: fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }),
  error: fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }),
});

// Helper: arbitrary for FrameRateThreshold
const frameRateThresholdArb = fc.record({
  warningBelow: fc.double({ min: 0, max: 240, noNaN: true, noDefaultInfinity: true }),
  errorBelow: fc.double({ min: 0, max: 240, noNaN: true, noDefaultInfinity: true }),
});

// Helper: arbitrary for PerformanceThresholds
const performanceThresholdsArb: fc.Arbitrary<PerformanceThresholds> = fc.record({
  drawCalls: thresholdRangeArb,
  gcAllocation: thresholdRangeArb,
  shaderComplexity: thresholdRangeArb,
  frameRate: frameRateThresholdArb,
});

// Feature: kiro-unity-power, Property 20: Custom Threshold Persistence
describe('Property 20: Custom Threshold Persistence', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-thresh-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('round-trips: save then load returns equivalent thresholds', () => {
    fc.assert(
      fc.property(performanceThresholdsArb, (thresholds) => {
        saveThresholds(thresholds, { customDir: tmpDir });
        const loaded = loadThresholds({ customDir: tmpDir });
        expect(loaded).toEqual(thresholds);
      }),
      { numRuns: 100 },
    );
  });

  it('returns default thresholds when no file exists', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-empty-'));
    try {
      const loaded = loadThresholds({ customDir: emptyDir });
      expect(loaded).toEqual(DEFAULT_THRESHOLDS);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
