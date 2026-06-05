import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { getLogger } from '@openio/shared';
import { ProjectAnalyzer } from './analyzer.js';

export interface RefactoringSuggestion {
  file: string;
  line?: number;
  type: 'style' | 'performance' | 'correctness' | 'security' | 'maintainability';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

export interface RefactoringPlan {
  title: string;
  description: string;
  suggestions: RefactoringSuggestion[];
  estimatedEffort: string;
}

export class ProjectRefactor {
  private root: string;

  constructor(root?: string) {
    this.root = resolve(root ?? process.cwd());
  }

  async analyzeProject(): Promise<RefactoringSuggestion[]> {
    const analyzer = new ProjectAnalyzer(this.root);
    const info = await analyzer.analyze();
    const suggestions: RefactoringSuggestion[] = [];

    if (info.language === 'typescript' && !existsSync(join(this.root, 'tsconfig.json'))) {
      suggestions.push({
        file: 'tsconfig.json',
        type: 'maintainability',
        severity: 'medium',
        description: 'Missing TypeScript configuration',
        suggestion: 'Add tsconfig.json with strict mode enabled',
      });
    }

    if (info.dependencies && !info.dependencies.zod && !info.devDependencies?.zod) {
      const hasAnyDep = Object.keys(info.dependencies).length > 0 || Object.keys(info.devDependencies ?? {}).length > 0;
      if (hasAnyDep && info.language === 'typescript') {
        suggestions.push({
          file: 'package.json',
          type: 'maintainability',
          severity: 'low',
          description: 'Consider adding Zod for runtime validation',
          suggestion: 'Add zod to dependencies for type-safe runtime validation',
        });
      }
    }

    if (info.frameworks.includes('express')) {
      const files = analyzer.findFiles('*.ts');
      for (const f of files) {
        const content = analyzer.readFile(f);
        if (content && content.includes('app.listen') && !content.includes('process.env.PORT')) {
          suggestions.push({
            file: f,
            type: 'correctness',
            severity: 'medium',
            description: 'Hardcoded port in server listen',
            suggestion: 'Use process.env.PORT || 3000 for configurable port',
          });
        }
      }
    }

    getLogger().info({ suggestions: suggestions.length }, 'Refactoring analysis complete');
    return suggestions;
  }

  async applySuggestion(suggestion: RefactoringSuggestion): Promise<boolean> {
    const fullPath = resolve(this.root, suggestion.file);
    if (!existsSync(fullPath)) return false;

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const newContent = this.applyFix(content, suggestion);
      if (newContent !== content) {
        writeFileSync(fullPath, newContent, 'utf-8');
        getLogger().info({ file: suggestion.file }, 'Applied refactoring');
        return true;
      }
      return false;
    } catch (err) {
      getLogger().error({ file: suggestion.file, error: (err as Error).message }, 'Refactoring failed');
      return false;
    }
  }

  private applyFix(content: string, suggestion: RefactoringSuggestion): string {
    switch (suggestion.type) {
      case 'correctness':
        if (suggestion.description.includes('Hardcoded port')) {
          return content.replace(/app\.listen\(\s*(\d+)\s*\)/, 'app.listen(process.env.PORT || $1)');
        }
        return content;
      default:
        return content;
    }
  }
}
