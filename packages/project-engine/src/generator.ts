import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, resolve, basename, dirname } from 'node:path';
import { getLogger } from '@openio/shared';

export interface TemplateVariable {
  key: string;
  description: string;
  default?: string;
}

export interface TemplateDefinition {
  name: string;
  description: string;
  variables: TemplateVariable[];
  files: Record<string, string>;
}

const BUILT_IN_TEMPLATES: Record<string, TemplateDefinition> = {};

export function registerTemplate(name: string, template: TemplateDefinition): void {
  BUILT_IN_TEMPLATES[name] = template;
  getLogger().info({ template: name }, 'Template registered');
}

export function getTemplate(name: string): TemplateDefinition | undefined {
  return BUILT_IN_TEMPLATES[name];
}

export function listTemplates(): string[] {
  return Object.keys(BUILT_IN_TEMPLATES);
}

function resolveTemplatePath(templateName: string): string | null {
  const searchPaths = [
    join(process.cwd(), 'templates', templateName),
    join(__dirname, '..', '..', '..', 'templates', templateName),
    join(__dirname, '..', '..', 'templates', templateName),
    join(__dirname, '..', 'templates', templateName),
  ];

  for (const p of searchPaths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function substituteVariables(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`).replace(/\{\{(\w+):[^}]+\}\}/g, (match, key) => {
    const fallback = match.match(/\{\{\w+:([^}]+)\}\}/)?.[1] ?? '';
    return vars[key] ?? fallback;
  });
}

export class ProjectGenerator {
  private outputRoot: string;

  constructor(outputRoot?: string) {
    this.outputRoot = resolve(outputRoot ?? process.cwd());
  }

  async generate(templateName: string, vars: Record<string, string>): Promise<string[]> {
    const template = BUILT_IN_TEMPLATES[templateName];
    if (template) return this.generateFromDefinition(template, vars);

    const templatePath = resolveTemplatePath(templateName);
    if (!templatePath) {
      throw new Error(`Template '${templateName}' not found. Available: ${listTemplates().join(', ')}`);
    }

    return this.generateFromDir(templatePath, vars);
  }

  private generateFromDefinition(template: TemplateDefinition, vars: Record<string, string>): string[] {
    const created: string[] = [];
    const resolvedVars = { ...vars };

    for (const v of template.variables) {
      if (!resolvedVars[v.key]) resolvedVars[v.key] = v.default ?? '';
    }

    for (const [filePath, content] of Object.entries(template.files)) {
      const fullPath = resolve(this.outputRoot, substituteVariables(filePath, resolvedVars));
      const dir = dirname(fullPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, substituteVariables(content, resolvedVars), 'utf-8');
      created.push(fullPath);
    }

    return created;
  }

  private generateFromDir(templateDir: string, vars: Record<string, string>): string[] {
    const created: string[] = [];
    const resolvedVars = { ...vars };
    const scanDir = (dir: string, relativePath: string) => {
      const entries = existsSync(dir) ? readFileSync(dir, 'utf-8')?.split('\n') : [];
    };

    const walk = (dir: string, relPath: string) => {
      try {
        const fs = require('node:fs');
        const entries = fs.readdirSync(dir, { withFileTypes: true } as any) as any[];
        for (const entry of entries) {
          const srcPath = join(dir, entry.name);
          const rel = join(relPath, entry.name);

          if (entry.isDirectory()) {
            if (entry.name.startsWith('.')) continue;
            const destDir = resolve(this.outputRoot, substituteVariables(rel, resolvedVars));
            if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
            walk(srcPath, rel);
          } else {
            const content = readFileSync(srcPath, 'utf-8');
            const destPath = resolve(this.outputRoot, substituteVariables(rel, resolvedVars));
            const destDir = dirname(destPath);
            if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
            writeFileSync(destPath, substituteVariables(content, resolvedVars), 'utf-8');
            created.push(destPath);
          }
        }
      } catch (err) {
        getLogger().warn({ dir, error: (err as Error).message }, 'Template walk error');
      }
    };

    walk(templateDir, '');
    getLogger().info({ template: basename(templateDir), files: created.length }, 'Template generated');
    return created;
  }
}
