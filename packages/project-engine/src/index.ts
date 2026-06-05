export { ProjectAnalyzer } from './analyzer.js';
export type { ProjectInfo, FileNode } from './analyzer.js';

export { ProjectPlanner } from './planner.js';
export type { PlanStep, ImplementationPlan } from './planner.js';

export { ProjectGenerator, registerTemplate, getTemplate, listTemplates } from './generator.js';
export type { TemplateVariable, TemplateDefinition } from './generator.js';

export { ProjectRefactor } from './refactor.js';
export type { RefactoringSuggestion, RefactoringPlan } from './refactor.js';

export { ProjectTester } from './tester.js';
export type { TestResult, TestFile, TestFramework } from './tester.js';

export { ProjectMigrator } from './migration.js';
export type { MigrationPlan, MigrationStep, Framework } from './migration.js';

export { DependencyAnalyzer } from './dependency-graph.js';
export type { DependencyNode, DependencyEdge, DependencyGraph } from './dependency-graph.js';
