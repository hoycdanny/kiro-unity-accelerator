// ============================================================
// Enums
// ============================================================

export enum AssetType {
  Model = 'Model',
  Texture = 'Texture',
  Audio = 'Audio',
  Material = 'Material',
}

export enum RigType {
  None = 'None',
  Generic = 'Generic',
  Humanoid = 'Humanoid',
}

export enum AnimationType {
  None = 'None',
  Legacy = 'Legacy',
  Generic = 'Generic',
  Humanoid = 'Humanoid',
}

export enum MeshCompression {
  Off = 'Off',
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum MaterialImportMode {
  None = 'None',
  ImportViaMaterialDescription = 'ImportViaMaterialDescription',
  ImportViaStandard = 'ImportViaStandard',
}

export enum TextureCompression {
  None = 'None',
  LowQuality = 'LowQuality',
  NormalQuality = 'NormalQuality',
  HighQuality = 'HighQuality',
}

export enum TextureType {
  Default = 'Default',
  NormalMap = 'NormalMap',
  Sprite = 'Sprite',
  Lightmap = 'Lightmap',
}

export enum FilterMode {
  Point = 'Point',
  Bilinear = 'Bilinear',
  Trilinear = 'Trilinear',
}

export enum BuildTarget {
  StandaloneWindows64 = 'StandaloneWindows64',
  Android = 'Android',
  iOS = 'iOS',
  WebGL = 'WebGL',
}

export enum BuildCompression {
  None = 'None',
  Lz4 = 'Lz4',
  Lz4HC = 'Lz4HC',
}

export enum ScriptingBackend {
  Mono = 'Mono',
  IL2CPP = 'IL2CPP',
}

export enum SeverityLevel {
  Error = 'Error',
  Warning = 'Warning',
  Suggestion = 'Suggestion',
}

export enum ScaffoldCategory {
  TwoD = '2D',
  ThreeD = '3D',
  UI = 'UI',
  Multiplayer = 'Multiplayer',
}

export enum ArchitecturePattern {
  MVC = 'MVC',
  ECS = 'ECS',
  ScriptableObject = 'ScriptableObject',
  Custom = 'Custom',
}

export enum RuleType {
  NamingConvention = 'NamingConvention',
  LayerDependency = 'LayerDependency',
  InheritanceConstraint = 'InheritanceConstraint',
  CyclicDependency = 'CyclicDependency',
}

export enum Platform {
  iOS = 'iOS',
  Android = 'Android',
  Console = 'Console',
  WebGL = 'WebGL',
}

export enum KnowledgeStatus {
  Active = 'Active',
  NeedsReview = 'NeedsReview',
}

export enum OnFailure {
  Pause = 'pause',
  Skip = 'skip',
  Abort = 'abort',
}

// ============================================================
// Data Model Interfaces
// ============================================================

// --- Asset Preset (Requirement 1) ---

export interface ModelImportConfig {
  scaleFactor?: number;
  meshCompression?: MeshCompression;
  generateColliders?: boolean;
  rigType?: RigType;
  animationType?: AnimationType;
  materialImportMode?: MaterialImportMode;
  normalMapEnabled?: boolean;
}

export interface TextureImportConfig {
  maxSize?: number;
  compression?: TextureCompression;
  textureType?: TextureType;
  filterMode?: FilterMode;
  generateMipMaps?: boolean;
}

export interface AssetPresetConfig {
  modelImport?: ModelImportConfig;
  textureImport?: TextureImportConfig;
}

export interface McpToolMapping {
  primaryTool: string;
  action: string;
  settingsMap?: Record<string, string>;
}

export interface AssetPreset {
  id: string;
  name: string;
  description: string;
  assetType: AssetType;
  isBuiltIn: boolean;
  config: AssetPresetConfig;
  namingPatterns: string[];
  mcpToolMapping: McpToolMapping;
  createdAt: string;
  updatedAt: string;
}

// --- Scene Scaffold (Requirement 2) ---

export interface ComponentDef {
  typeName: string;
  properties: Record<string, unknown>;
}

export interface SceneNode {
  name: string;
  tag?: string;
  layer?: string;
  components: ComponentDef[];
  children: SceneNode[];
  mcpTool: string;
  mcpArgs: Record<string, unknown>;
}

export interface SceneScaffold {
  id: string;
  name: string;
  description: string;
  category: ScaffoldCategory;
  isBuiltIn: boolean;
  hierarchy: SceneNode[];
  requiredPackages: string[];
  createdAt: string;
}

// --- Build Config (Requirement 3) ---

export interface BuildOptions {
  development: boolean;
  allowDebugging: boolean;
  compression: BuildCompression;
  scriptingBackend: ScriptingBackend;
}

export interface BuildConfig {
  id: string;
  name: string;
  target: BuildTarget;
  scenes: string[];
  outputPath: string;
  options: BuildOptions;
  mcpToolMapping: McpToolMapping;
  useCloudAssist: boolean;
  createdAt: string;
}

// --- Workflow Template (Requirement 5) ---

export interface WorkflowStep {
  id: string;
  name: string;
  mcpTool: string;
  mcpAction: string;
  mcpArgs: Record<string, unknown>;
  dependsOn: string[];
  onFailure: OnFailure;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  steps: WorkflowStep[];
  createdAt: string;
}

// --- Performance (Requirement 6) ---

export interface ThresholdRange {
  warning: number;
  error: number;
}

export interface FrameRateThreshold {
  warningBelow: number;
  errorBelow: number;
}

export interface PerformanceThresholds {
  drawCalls: ThresholdRange;
  gcAllocation: ThresholdRange;
  shaderComplexity: ThresholdRange;
  frameRate: FrameRateThreshold;
  customThresholds?: Record<string, ThresholdRange>;
}

export interface MetricValue {
  average: number;
  peak: number;
}

export interface FrameRateMetric {
  average: number;
  min: number;
}

export interface PerformanceMetrics {
  drawCalls: MetricValue;
  gcAllocation: MetricValue;
  shaderComplexity: MetricValue;
  frameRate: FrameRateMetric;
}

export interface Bottleneck {
  metric: string;
  objectPath: string;
  value: number;
  suggestion: string;
}

export interface PerformanceReport {
  id: string;
  timestamp: string;
  metrics: PerformanceMetrics;
  bottlenecks: Bottleneck[];
  thresholdsUsed: PerformanceThresholds;
}

// --- Architecture Rule (Requirement 7) ---

export interface RuleConfig {
  type: RuleType;
  config: Record<string, unknown>;
}

export interface ArchitectureRule {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  enabled: boolean;
  pattern: ArchitecturePattern;
  rules: RuleConfig[];
}

// --- Platform Profile (Requirement 9) ---

export interface ShaderFeatures {
  unsupported: string[];
  alternatives: Record<string, string>;
}

export interface MemoryBudget {
  maxTextureMB: number;
  maxMeshMB: number;
  maxAudioMB: number;
  maxTotalMB: number;
}

export interface ScriptingConstraints {
  disallowedAPIs: string[];
  requiredDefines: string[];
}

export interface PlatformChecks {
  shaderFeatures: ShaderFeatures;
  memoryBudget: MemoryBudget;
  scriptingConstraints: ScriptingConstraints;
}

export interface PlatformProfile {
  id: string;
  name: string;
  platform: Platform;
  isBuiltIn: boolean;
  checks: PlatformChecks;
}

// --- Knowledge Entry (Requirement 8) ---

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  relatedAssets: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  status: KnowledgeStatus;
  reviewDeadline: string;
}

// --- Dependency Tree (Requirement 10) ---

export interface DependencyNode {
  assetPath: string;
  assetType: string;
  dependencies: string[];
  referencedBy: string[];
}

export interface CircularReference {
  path: string[];
}

export interface DependencyTree {
  rootAsset: string;
  nodes: DependencyNode[];
  circularReferences: CircularReference[];
}

// ============================================================
// MCP Tool Call Types
// ============================================================

export interface McpToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface BatchExecutePayload {
  commands: McpToolCall[];
}

export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface BatchExecuteResult {
  results: McpToolResult[];
  successCount: number;
  failureCount: number;
}

// ============================================================
// Utility Types
// ============================================================

/** Union of all config entity types that support CRUD operations. */
export type ConfigEntity =
  | AssetPreset
  | SceneScaffold
  | BuildConfig
  | WorkflowTemplate
  | ArchitectureRule
  | PlatformProfile
  | KnowledgeEntry
  | PerformanceThresholds;

// ============================================================
// Profiler Screenshot Analyzer 型別
// ============================================================

/** Profiler 截圖的輸入資料 */
export interface ScreenshotInput {
  /** 截圖的描述性資料（MCP 視覺工具提取的文字） */
  description: string;
  /** CPU 時間軸資料（若可提取） */
  cpuTimeline?: CpuTimelineEntry[];
  /** 記憶體分配資料（若可提取） */
  memoryAllocations?: MemoryAllocationEntry[];
  /** GPU 使用率資料（若可提取） */
  gpuUsage?: number;
}

/** CPU 時間軸中的單一函式條目 */
export interface CpuTimelineEntry {
  functionName: string;
  /** 執行時間（毫秒） */
  timeMs: number;
  /** 佔總 CPU 時間的百分比 */
  percentage: number;
}

/** 記憶體分配條目 */
export interface MemoryAllocationEntry {
  source: string;
  /** 分配量（位元組） */
  sizeBytes: number;
  /** 是否為 GC 分配 */
  isGcAllocation: boolean;
}

/** Profiler 指標 */
export interface ProfilerMetrics {
  cpuUsagePercent: number;
  gpuUsagePercent: number;
  memoryUsageMB: number;
  gcAllocationBytes: number;
  drawCalls: number;
  frameTimeMs: number;
}

/** 效能熱點 */
export interface Hotspot {
  /** 熱點類別：cpu、gpu、memory */
  category: 'cpu' | 'gpu' | 'memory';
  /** 描述 */
  description: string;
  /** 相關數值 */
  value: number;
  /** 嚴重程度 */
  severity: SeverityLevel;
  /** 來源（函式名稱或物件路徑） */
  source: string;
}

/** 函式執行時間排序結果 */
export interface FunctionTiming {
  functionName: string;
  timeMs: number;
  percentage: number;
}

/** 截圖分析結果 */
export interface ScreenshotAnalysisResult {
  metrics: ProfilerMetrics;
  hotspots: Hotspot[];
  functionTimings: FunctionTiming[];
  memoryAllocations: MemoryAllocationEntry[];
  /** 分析是否成功 */
  success: boolean;
  /** 錯誤訊息（若分析失敗） */
  error?: string;
}

// ============================================================
// Code Performance Scanner 型別
// ============================================================

/** 反模式類型 */
export type AntipatternType =
  | 'GetComponentInUpdate'
  | 'StringConcatInUpdate'
  | 'LinqInUpdate'
  | 'NewAllocationInUpdate'
  | 'FindInUpdate'
  | 'NoStaticBatching'
  | 'NoGpuInstancing'
  | 'TooManyMaterials'
  | 'FrequentArrayAllocation'
  | 'ForeachNonGeneric'
  | 'ClosureAllocation';

/** 反模式匹配結果 */
export interface AntipatternMatch {
  filePath: string;
  lineNumber: number;
  antipatternType: AntipatternType;
  severity: SeverityLevel;
  /** 匹配到的程式碼片段 */
  codeSnippet: string;
  /** 問題描述 */
  description: string;
}

/** 掃描用的上下文（追蹤是否在 Update 類方法內） */
export interface ScanContext {
  /** 目前是否在 Update/FixedUpdate/LateUpdate 方法內 */
  inUpdateMethod: boolean;
  /** 目前方法名稱 */
  currentMethod: string;
  /** 大括號深度 */
  braceDepth: number;
}

/** 腳本檔案 */
export interface ScriptFile {
  filePath: string;
  content: string;
}

/** 程式碼掃描結果 */
export interface CodeScanResult {
  antipatterns: AntipatternMatch[];
  /** 掃描失敗的檔案清單 */
  failedFiles: FailedFile[];
  /** 成功掃描的檔案數 */
  scannedCount: number;
}

/** 掃描失敗的檔案 */
export interface FailedFile {
  filePath: string;
  error: string;
}

// ============================================================
// Optimization Advisor 型別
// ============================================================

/** 最佳化方案 */
export interface OptimizationPlan {
  /** 方案標題 */
  title: string;
  /** 詳細描述 */
  description: string;
  /** 對應的熱點類型或反模式類型 */
  targetType: string;
  /** 具體步驟 */
  steps: string[];
  /** 預估影響程度 */
  estimatedImpact: 'high' | 'medium' | 'low';
  /** 實作難度 */
  implementationDifficulty: 'high' | 'medium' | 'low';
}

// ============================================================
// Report Integrator 型別
// ============================================================

/** 完整的效能分析報告 */
export interface ProfilerReport {
  id: string;
  timestamp: string;
  /** 截圖分析結果 */
  screenshotAnalysis: ScreenshotAnalysisResult | null;
  /** 程式碼掃描結果 */
  codeScanResult: CodeScanResult | null;
  /** 最佳化方案 */
  optimizations: OptimizationPlan[];
  /** 報告摘要 */
  summary: ReportSummary;
}

/** 報告摘要 */
export interface ReportSummary {
  /** 熱點總數 */
  totalHotspots: number;
  /** 各嚴重程度的問題數量 */
  severityCounts: Record<SeverityLevel, number>;
  /** 最優先處理的前三項問題 */
  topIssues: TopIssue[];
}

/** 優先問題 */
export interface TopIssue {
  description: string;
  severity: SeverityLevel;
  source: string;
}



// ============================================================
// UI Dependency Analysis 型別
// ============================================================

/** UI 元件類型 */
export type UIComponentType =
  | 'Button'
  | 'Toggle'
  | 'Slider'
  | 'InputField'
  | 'Dropdown'
  | 'ScrollRect'
  | 'Text'
  | 'Image';

/** UI 元件引用方式 */
export type ReferenceMethod =
  | 'SerializeField'
  | 'PublicField'
  | 'GetComponent'
  | 'GetComponentInChildren'
  | 'GameObjectFind'
  | 'TransformFind'
  | 'AddComponent';

/** 事件訂閱模式 */
export type EventSubscriptionPattern =
  | 'AddListener'
  | 'CSharpEventSubscription'
  | 'SerializedUnityEvent'
  | 'SendMessage'
  | 'BroadcastMessage';

/** 狀態變更類型 */
export type StateMutationType =
  | 'StaticFieldWrite'
  | 'ScriptableObjectModify'
  | 'PlayerPrefsWrite'
  | 'SingletonStateModify';

/** 事件節點類型 */
export type EventNodeType =
  | 'EventTrigger'
  | 'EventHandler'
  | 'StateMutation';

/** 重構建議類型 */
export type RefactoringSuggestionType =
  | 'EventBus'
  | 'ScriptableObjectChannel'
  | 'LayerSeparation'
  | 'InterfaceDecoupling';

/** UI 元件查詢條件 */
export interface UIComponentQuery {
  name?: string;
  typeName?: string;
}

/** 腳本對 UI 元件的引用 */
export interface ScriptReference {
  filePath: string;
  lineNumber: number;
  referenceMethod: ReferenceMethod;
  componentType: UIComponentType | string;
  /** 引用的變數或欄位名稱 */
  fieldName: string;
}

/** UI 引用追蹤結果 */
export interface UIReferenceResult {
  query: UIComponentQuery;
  references: ScriptReference[];
  /** 高扇入元件（被 3 個以上腳本引用） */
  highFanInComponents: HighFanInComponent[];
  /** 掃描失敗的檔案 */
  failedFiles: FailedFile[];
}

/** 高扇入元件 */
export interface HighFanInComponent {
  componentType: string;
  fieldName: string;
  referenceCount: number;
  referencingScripts: string[];
}

/** UI 依賴圖 */
export interface UIDependencyGraph {
  nodes: UIDependencyNode[];
  edges: UIDependencyEdge[];
}

/** 依賴圖節點 */
export interface UIDependencyNode {
  id: string;
  type: 'script' | 'uiComponent';
  filePath?: string;
  componentType?: string;
}

/** 依賴圖邊 */
export interface UIDependencyEdge {
  source: string;
  target: string;
  referenceMethod: ReferenceMethod;
  lineNumber: number;
}

/** 事件調用鏈入口點 */
export interface EventEntryPoint {
  scriptPath: string;
  componentType: UIComponentType | string;
  eventName: string;
}

/** 事件調用鏈選項 */
export interface EventChainOptions {
  maxDepth?: number;
}

/** 事件調用鏈中的節點 */
export interface EventNode {
  functionName: string;
  scriptPath: string;
  lineNumber: number;
  nodeType: EventNodeType;
  subscriptionPattern?: EventSubscriptionPattern;
  stateMutationType?: StateMutationType;
}

/** 單一事件調用鏈 */
export interface EventChain {
  entryPoint: EventEntryPoint;
  nodes: EventNode[];
  depth: number;
  /** 是否為過深調用鏈（深度 > 5） */
  isDeepChain: boolean;
  /** 若存在循環，記錄循環路徑 */
  cyclePath?: string[];
}

/** 事件調用鏈分析結果 */
export interface EventChainResult {
  chains: EventChain[];
  /** 過深調用鏈數量 */
  deepChainCount: number;
  /** 偵測到的循環數量 */
  cycleCount: number;
}

/** 耦合配對 */
export interface CouplingPair {
  scriptA: string;
  scriptB: string;
  couplingScore: number;
  directReferenceCount: number;
  maxChainDepth: number;
  sharedStateMutationCount: number;
  isBidirectional: boolean;
}

/** 重構建議 */
export interface RefactoringSuggestion {
  type: RefactoringSuggestionType;
  title: string;
  problemDescription: string;
  steps: string[];
  estimatedImpact: 'high' | 'medium' | 'low';
  targetScripts: string[];
}

/** 完整的 UI 依賴分析報告 */
export interface UIDependencyReport {
  id: string;
  timestamp: string;
  referenceResult: UIReferenceResult;
  chainResult: EventChainResult;
  couplingPairs: CouplingPair[];
  suggestions: RefactoringSuggestion[];
  summary: UIDependencyReportSummary;
}

/** 報告摘要 */
export interface UIDependencyReportSummary {
  totalUIComponents: number;
  totalScriptReferences: number;
  totalEventChains: number;
  deepChainCount: number;
  highCouplingPairCount: number;
}

// ============================================================================
// Level Design Tooling — Editor Extension Generator
// ============================================================================

/** 目標類別的序列化欄位資訊 */
export interface SerializedFieldInfo {
  name: string;
  typeName: string;       // e.g. "int", "float", "string", "GameObject", "EnemyType"
  isEnum: boolean;
  isList: boolean;
  listElementType?: string;
}

/** 生成 Custom Inspector 腳本的輸入參數 */
export interface InspectorGenInput {
  targetClassName: string;
  fields: SerializedFieldInfo[];
  namespace?: string;
}

/** 生成 EditorWindow 批次工具腳本的輸入參數 */
export interface BatchToolGenInput {
  toolName: string;
  description: string;
  targetComponentType: string;
  operations: BatchOperation[];
}

export interface BatchOperation {
  fieldName: string;
  operationType: 'set' | 'increment' | 'multiply';
  valueExpression: string;
}

/** 腳本生成結果 */
export interface ScriptGenResult {
  fileName: string;
  filePath: string;       // e.g. "Assets/Editor/EnemyConfigInspector.cs"
  content: string;
  scriptType: 'inspector' | 'editorWindow' | 'scriptableObject';
}

// ============================================================================
// Level Design Tooling — ScriptableObject Template Builder
// ============================================================================

/** 欄位定義 */
export interface FieldDefinition {
  name: string;
  typeName: string;
  tooltip: string;
  defaultValue?: string;
  validation?: FieldValidation;
  isNested: boolean;
  nestedFields?: FieldDefinition[];
}

export interface FieldValidation {
  type: 'range' | 'min' | 'max' | 'custom';
  params: Record<string, number | string>;
}

/** ScriptableObject 模板定義 */
export interface SOTemplateDefinition {
  className: string;
  menuPath: string;
  fileName: string;
  description: string;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** 生成結果（包含 SO 腳本 + Inspector 腳本） */
export interface SOGenResult {
  soScript: ScriptGenResult;
  inspectorScript: ScriptGenResult;
  nestedClassScripts: ScriptGenResult[];
}

// ============================================================================
// Level Design Tooling — Scene Batch Configurator
// ============================================================================

/** 篩選條件 */
export interface FilterCondition {
  type: 'name' | 'tag' | 'layer' | 'component' | 'parentPath';
  value: string;
  useWildcard: boolean;
}

/** 批次設定規則 */
export interface BatchRule {
  id: string;
  name: string;
  description: string;
  filters: FilterCondition[];
  actions: BatchAction[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface BatchAction {
  type: 'setLayer' | 'setTag' | 'setComponentProperty';
  params: Record<string, string | number | boolean>;
}

/** 批次設定預覽項目 */
export interface PreviewItem {
  gameObjectName: string;
  gameObjectPath: string;
  changes: ChangeDescription[];
}

export interface ChangeDescription {
  field: string;
  oldValue: string;
  newValue: string;
}

/** 批次設定執行結果 */
export interface BatchConfigResult {
  totalProcessed: number;
  successCount: number;
  skippedCount: number;
  skippedReasons: SkipReason[];
}

export interface SkipReason {
  gameObjectName: string;
  reason: string;
}

// ============================================================================
// Level Design Tooling — Template Registry
// ============================================================================

export interface TemplateListItem {
  name: string;
  description: string;
  fieldSummary: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}