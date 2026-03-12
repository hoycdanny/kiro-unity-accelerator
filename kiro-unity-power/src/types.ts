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
