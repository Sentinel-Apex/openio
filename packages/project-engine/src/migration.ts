import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { getLogger } from '@openio/shared';
import { ProjectAnalyzer } from './analyzer.js';
import type { ProjectInfo } from './analyzer.js';

export type Framework = 'express' | 'fastify' | 'nestjs' | 'nextjs' | 'react' | 'vue' | 'react-native' | 'django' | 'fastapi' | 'flask';

export interface MigrationPlan {
  from: Framework;
  to: Framework;
  steps: MigrationStep[];
  breakingChanges: string[];
  estimatedEffort: string;
}

export interface MigrationStep {
  title: string;
  description: string;
  files: string[];
  automated: boolean;
}

const MIGRATION_MAPS: Partial<Record<Framework, Partial<Record<Framework, string>>>> = {
  express: { fastify: 'express-to-fastify', nestjs: 'express-to-nestjs' },
  fastify: { express: 'fastify-to-express' },
  django: { fastapi: 'django-to-fastapi' },
  flask: { fastapi: 'flask-to-fastapi' },
};

export class ProjectMigrator {
  private root: string;

  constructor(root?: string) {
    this.root = resolve(root ?? process.cwd());
  }

  async analyzeMigration(from: Framework, to: Framework): Promise<MigrationPlan> {
    const analyzer = new ProjectAnalyzer(this.root);
    const info = await analyzer.analyze();

    getLogger().info({ from, to }, 'Creating migration plan');

    const steps: MigrationStep[] = this.generateSteps(from, to, info);

    return {
      from,
      to,
      steps,
      breakingChanges: this.getBreakingChanges(from, to),
      estimatedEffort: steps.length > 5 ? 'high' : steps.length > 2 ? 'medium' : 'low',
    };
  }

  private generateSteps(from: Framework, to: Framework, info: ProjectInfo): MigrationStep[] {
    const steps: MigrationStep[] = [];

    if (from === 'express' && to === 'fastify') {
      steps.push({ title: 'Install Fastify', description: 'Replace express with fastify package', files: ['package.json'], automated: true });
      steps.push({ title: 'Update server entry', description: 'Replace app.listen with Fastify server', files: info.entryPoints, automated: false });
      steps.push({ title: 'Migrate middleware', description: 'Convert Express middleware to Fastify plugins', files: ['src/middleware/'], automated: false });
      steps.push({ title: 'Migrate routes', description: 'Convert Express routes to Fastify route declarations', files: ['src/routes/'], automated: false });
      steps.push({ title: 'Update error handling', description: 'Replace Express error middleware', files: ['src/middleware/error.ts'], automated: false });
    } else if (from === 'express' && to === 'nestjs') {
      steps.push({ title: 'Install NestJS CLI', description: 'Install @nestjs/core and related packages', files: ['package.json'], automated: true });
      steps.push({ title: 'Create module structure', description: 'Set up NestJS modules, controllers, services', files: ['src/'], automated: false });
      steps.push({ title: 'Migrate routes to controllers', description: 'Convert Express routes to NestJS controllers', files: ['src/controllers/'], automated: false });
      steps.push({ title: 'Add dependency injection', description: 'Convert services to injectable providers', files: ['src/services/'], automated: false });
    } else if (from === 'django' && to === 'fastapi') {
      steps.push({ title: 'Create FastAPI app', description: 'Set up FastAPI application entry point', files: ['app/main.py'], automated: false });
      steps.push({ title: 'Convert URL patterns', description: 'Map Django URL patterns to FastAPI routes', files: ['app/routes/'], automated: false });
      steps.push({ title: 'Convert ORM to SQLAlchemy', description: 'Replace Django ORM with SQLAlchemy models', files: ['app/models/'], automated: false });
      steps.push({ title: 'Update serializers', description: 'Replace DRF serializers with Pydantic schemas', files: ['app/schemas/'], automated: false });
    } else {
      steps.push({ title: `Prepare ${to} migration`, description: `Manual migration from ${from} to ${to} required`, files: [], automated: false });
    }

    return steps;
  }

  private getBreakingChanges(from: Framework, to: Framework): string[] {
    const changes: string[] = [];
    if (from === 'express' && to === 'fastify') {
      changes.push('Middleware API is different (use fastify plugins)');
      changes.push('Error handling uses Fastify error codes');
      changes.push('Request/Reply API differs from Express req/res');
    }
    if (from === 'express' && to === 'nestjs') {
      changes.push('Architecture must follow module/controller/service pattern');
      changes.push('Dependency injection replaces manual instantiation');
      changes.push('Route decorators replace app.get/post');
    }
    return changes;
  }

  async applyStep(step: MigrationStep): Promise<boolean> {
    if (!step.automated) {
      getLogger().info({ step: step.title }, 'Manual step - no automated action taken');
      return false;
    }

    if (step.title.startsWith('Install')) {
      const pkg = step.title.replace('Install ', '').toLowerCase();
      const pkgPath = join(this.root, 'package.json');
      if (existsSync(pkgPath)) {
        const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        pkgJson.dependencies = pkgJson.dependencies ?? {};
        pkgJson.dependencies[pkg] = 'latest';
        writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2), 'utf-8');
        getLogger().info({ pkg }, 'Added dependency');
        return true;
      }
    }

    return false;
  }
}
