import { getLogger } from '@openio/shared';
import type { ProjectInfo } from './analyzer.js';

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  files: string[];
  dependencies: string[];
  agent?: string;
  estimatedEffort?: 'low' | 'medium' | 'high';
}

export interface ImplementationPlan {
  title: string;
  summary: string;
  steps: PlanStep[];
  estimatedSteps: number;
  warnings: string[];
}

export class ProjectPlanner {
  async createPlan(requirements: string, projectInfo: ProjectInfo): Promise<ImplementationPlan> {
    getLogger().info({ project: projectInfo.name }, 'Creating implementation plan');

    const steps = this.generateSteps(requirements, projectInfo);

    return {
      title: `Implementation Plan: ${projectInfo.name}`,
      summary: `Plan to implement: ${requirements.slice(0, 100)}...`,
      steps,
      estimatedSteps: steps.length,
      warnings: this.generateWarnings(projectInfo),
    };
  }

  private generateSteps(requirements: string, info: ProjectInfo): PlanStep[] {
    const steps: PlanStep[] = [];
    const reqLower = requirements.toLowerCase();

    if (info.frameworks.length === 0 || info.frameworks[0] === 'unknown') {
      steps.push(this.scaffoldStep(info));
    }

    if (reqLower.includes('api') || reqLower.includes('endpoint') || reqLower.includes('route') || reqLower.includes('backend')) {
      steps.push({
        id: 'api',
        title: 'Implement API endpoints',
        description: 'Create REST/GraphQL API endpoints',
        files: ['src/routes/', 'src/controllers/', 'src/services/'],
        dependencies: ['scaffold'],
        agent: 'backend',
        estimatedEffort: 'high',
      });
    }

    if (reqLower.includes('ui') || reqLower.includes('component') || reqLower.includes('page') || reqLower.includes('frontend') || reqLower.includes('react')) {
      steps.push({
        id: 'ui',
        title: 'Build UI components',
        description: 'Create frontend UI components and pages',
        files: ['src/components/', 'src/pages/', 'src/app/'],
        dependencies: ['scaffold'],
        agent: 'frontend',
        estimatedEffort: 'high',
      });
    }

    if (reqLower.includes('database') || reqLower.includes('schema') || reqLower.includes('table') || reqLower.includes('model') || reqLower.includes('migration')) {
      steps.push({
        id: 'database',
        title: 'Design database schema',
        description: 'Create database schema, models, and migrations',
        files: ['prisma/', 'src/models/', 'migrations/'],
        dependencies: ['scaffold'],
        agent: 'database',
        estimatedEffort: 'medium',
      });
    }

    if (reqLower.includes('docker') || reqLower.includes('deploy') || reqLower.includes('ci') || reqLower.includes('infrastructure')) {
      steps.push({
        id: 'devops',
        title: 'Set up deployment',
        description: 'Configure Docker, CI/CD, and deployment',
        files: ['Dockerfile', '.github/workflows/', 'docker-compose.yml'],
        dependencies: ['scaffold'],
        agent: 'devops',
        estimatedEffort: 'medium',
      });
    }

    if (reqLower.includes('auth') || reqLower.includes('login') || reqLower.includes('security') || reqLower.includes('oauth')) {
      steps.push({
        id: 'auth',
        title: 'Implement authentication',
        description: 'Add authentication and authorization',
        files: ['src/auth/', 'src/middleware/'],
        dependencies: ['api'],
        agent: 'backend',
        estimatedEffort: 'medium',
      });
    }

    if (reqLower.includes('test') || reqLower.includes('spec')) {
      steps.push({
        id: 'testing',
        title: 'Write tests',
        description: 'Add unit and integration tests',
        files: ['tests/', 'src/__tests__/'],
        dependencies: steps.filter((s) => s.id !== 'scaffold').map((s) => s.id),
        agent: 'testing',
        estimatedEffort: 'medium',
      });
    }

    if (steps.length === 0) {
      steps.push({
        id: 'default',
        title: 'Implement requirements',
        description: requirements,
        files: ['src/'],
        dependencies: [],
        agent: 'backend',
        estimatedEffort: 'medium',
      });
    }

    return steps;
  }

  private scaffoldStep(info: ProjectInfo): PlanStep {
    const framework = info.frameworks[0] ?? 'node';
    return {
      id: 'scaffold',
      title: `Scaffold ${framework} project`,
      description: `Initialize project structure for ${framework}`,
      files: ['package.json', 'tsconfig.json', 'src/'],
      dependencies: [],
      agent: 'backend',
      estimatedEffort: 'low',
    };
  }

  private generateWarnings(info: ProjectInfo): string[] {
    const warnings: string[] = [];
    if (Object.keys(info.dependencies).length === 0) warnings.push('No dependencies detected');
    if (!info.entryPoints.length) warnings.push('No entry point detected');
    return warnings;
  }
}
