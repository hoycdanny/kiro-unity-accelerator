/**
 * Integration smoke test — verifies the full UI dependency analysis pipeline:
 * C# scripts → trackUIReferences → analyzeEventChain → calculateCouplingScores
 * → generateRefactoringSuggestions → integrateUIDependencyReport
 * → serializeUIDependencyReport → deserializeUIDependencyReport
 *
 * Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1
 */
import { trackUIReferences } from '../../src/ui-reference-tracker';
import { analyzeEventChain } from '../../src/event-chain-analyzer';
import { calculateCouplingScores, generateRefactoringSuggestions } from '../../src/coupling-advisor';
import { integrateUIDependencyReport } from '../../src/ui-dependency-report';
import {
  serializeUIDependencyReport,
  deserializeUIDependencyReport,
  formatUIDependencyReportAsText,
} from '../../src/ui-dependency-serialization';
import type {
  ScriptFile,
  UIComponentQuery,
  EventEntryPoint,
} from '../../src/types';

// ============================================================
// Realistic C# script fixtures
// ============================================================

const uiControllerScript: ScriptFile = {
  filePath: 'Assets/Scripts/UIController.cs',
  content: `using UnityEngine;
using UnityEngine.UI;

public class UIController : MonoBehaviour
{
    [SerializeField] private Button submitButton;
    [SerializeField] private Slider volumeSlider;
    [SerializeField] private Text scoreText;

    void Start()
    {
        submitButton.onClick.AddListener(OnSubmitClicked);
    }

    void OnSubmitClicked()
    {
        GameManager.score = 100;
    }
}`,
};

const gameManagerScript: ScriptFile = {
  filePath: 'Assets/Scripts/GameManager.cs',
  content: `using UnityEngine;
using UnityEngine.UI;

public class GameManager : MonoBehaviour
{
    public static int score;
    public Button submitButton;

    public void OnSubmitClicked()
    {
        PlayerPrefs.SetInt("score", score);
    }

    void UpdateUI()
    {
        SendMessage("OnScoreChanged");
    }
}`,
};

const audioManagerScript: ScriptFile = {
  filePath: 'Assets/Scripts/AudioManager.cs',
  content: `using UnityEngine;
using UnityEngine.UI;

public class AudioManager : MonoBehaviour
{
    private Slider volumeSlider;

    void Awake()
    {
        volumeSlider = GetComponent<Slider>();
    }

    void OnScoreChanged()
    {
        Instance.volume = 0.5f;
    }
}`,
};

const allScripts: ScriptFile[] = [uiControllerScript, gameManagerScript, audioManagerScript];

// ============================================================
// Full pipeline integration test
// ============================================================

describe('UI Dependency Analysis — Integration Smoke Test', () => {
  test('full pipeline: scripts → track → analyze → score → suggest → report → serialize → deserialize', () => {
    // Step 1: Track UI references
    const query: UIComponentQuery = { typeName: 'Button' };
    const referenceResult = trackUIReferences(allScripts, query);

    expect(referenceResult.references.length).toBeGreaterThan(0);
    // Both UIController and GameManager reference Button
    const refFiles = referenceResult.references.map((r) => r.filePath);
    expect(refFiles).toContain('Assets/Scripts/UIController.cs');
    expect(refFiles).toContain('Assets/Scripts/GameManager.cs');

    // Step 2: Analyze event chain from submitButton.onClick
    const entryPoint: EventEntryPoint = {
      scriptPath: 'Assets/Scripts/UIController.cs',
      componentType: 'Button',
      eventName: 'onClick',
    };
    const chainResult = analyzeEventChain(allScripts, entryPoint);

    expect(chainResult.chains.length).toBeGreaterThan(0);
    // At least one chain should have nodes
    expect(chainResult.chains[0].nodes.length).toBeGreaterThan(0);

    // Step 3: Calculate coupling scores
    // Use a broader reference result (all UI types) for richer coupling data
    const fullRefResult = trackUIReferences(allScripts, {});
    const couplingPairs = calculateCouplingScores(fullRefResult, chainResult);

    // There should be coupling pairs since scripts share UI components
    expect(couplingPairs.length).toBeGreaterThan(0);
    // Pairs should be sorted by score descending
    for (let i = 0; i < couplingPairs.length - 1; i++) {
      expect(couplingPairs[i].couplingScore).toBeGreaterThanOrEqual(
        couplingPairs[i + 1].couplingScore,
      );
    }

    // Step 4: Generate refactoring suggestions
    const suggestions = generateRefactoringSuggestions(couplingPairs);

    // Suggestions may or may not be generated depending on threshold;
    // just verify the array is valid
    expect(Array.isArray(suggestions)).toBe(true);
    for (const sug of suggestions) {
      expect(sug.title).toBeTruthy();
      expect(sug.steps.length).toBeGreaterThan(0);
      expect(['EventBus', 'ScriptableObjectChannel', 'LayerSeparation', 'InterfaceDecoupling']).toContain(sug.type);
    }

    // Step 5: Integrate report
    const report = integrateUIDependencyReport(fullRefResult, chainResult, couplingPairs, suggestions);

    expect(report.id).toBeTruthy();
    expect(report.timestamp).toBeTruthy();
    // Summary consistency checks (Property 13)
    expect(report.summary.totalScriptReferences).toBe(fullRefResult.references.length);
    expect(report.summary.totalEventChains).toBe(chainResult.chains.length);
    expect(report.summary.deepChainCount).toBe(chainResult.deepChainCount);
    // Coupling pairs sorted (Property 14)
    for (let i = 0; i < report.couplingPairs.length - 1; i++) {
      expect(report.couplingPairs[i].couplingScore).toBeGreaterThanOrEqual(
        report.couplingPairs[i + 1].couplingScore,
      );
    }

    // Step 6: Serialize
    const json = serializeUIDependencyReport(report);
    expect(typeof json).toBe('string');
    expect(json.length).toBeGreaterThan(0);

    // Step 7: Deserialize and verify round-trip (Property 15)
    const restored = deserializeUIDependencyReport(json);
    expect(restored.id).toBe(report.id);
    expect(restored.timestamp).toBe(report.timestamp);
    expect(restored.summary).toEqual(report.summary);
    expect(restored.referenceResult.references.length).toBe(report.referenceResult.references.length);
    expect(restored.chainResult.chains.length).toBe(report.chainResult.chains.length);
    expect(restored.couplingPairs.length).toBe(report.couplingPairs.length);
    expect(restored.suggestions.length).toBe(report.suggestions.length);

    // Step 8: Format as text (Property 16)
    const text = formatUIDependencyReportAsText(report);
    expect(text.length).toBeGreaterThan(0);
    // Text should contain file paths from references
    for (const ref of report.referenceResult.references) {
      expect(text).toContain(ref.filePath);
    }
    // Text should contain coupling pair script names
    for (const pair of report.couplingPairs) {
      expect(text).toContain(pair.scriptA);
      expect(text).toContain(pair.scriptB);
    }
    // Text should contain suggestion titles
    for (const sug of report.suggestions) {
      expect(text).toContain(sug.title);
    }
  });

  test('empty input: all functions return valid empty results without throwing', () => {
    const emptyScripts: ScriptFile[] = [];

    // trackUIReferences with empty scripts
    const refResult = trackUIReferences(emptyScripts, { typeName: 'Button' });
    expect(refResult.references).toEqual([]);
    expect(refResult.highFanInComponents).toEqual([]);
    expect(refResult.failedFiles).toEqual([]);

    // analyzeEventChain with empty scripts
    const entryPoint: EventEntryPoint = {
      scriptPath: 'nonexistent.cs',
      componentType: 'Button',
      eventName: 'onClick',
    };
    const chainResult = analyzeEventChain(emptyScripts, entryPoint);
    expect(chainResult.chains).toEqual([]);
    expect(chainResult.deepChainCount).toBe(0);
    expect(chainResult.cycleCount).toBe(0);

    // calculateCouplingScores with empty results
    const pairs = calculateCouplingScores(refResult, chainResult);
    expect(pairs).toEqual([]);

    // generateRefactoringSuggestions with empty pairs
    const suggestions = generateRefactoringSuggestions(pairs);
    expect(suggestions).toEqual([]);

    // integrateUIDependencyReport with empty data
    const report = integrateUIDependencyReport(refResult, chainResult, pairs, suggestions);
    expect(report.id).toBeTruthy();
    expect(report.summary.totalScriptReferences).toBe(0);
    expect(report.summary.totalEventChains).toBe(0);
    expect(report.summary.deepChainCount).toBe(0);
    expect(report.summary.highCouplingPairCount).toBe(0);

    // Serialize and deserialize empty report
    const json = serializeUIDependencyReport(report);
    const restored = deserializeUIDependencyReport(json);
    expect(restored.id).toBe(report.id);
    expect(restored.summary).toEqual(report.summary);

    // Format empty report as text
    const text = formatUIDependencyReportAsText(report);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('UI Dependency Analysis Report');
  });
});
