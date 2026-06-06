import { THEME_DIM } from './theme.js';

export function timestamp(time?: number): string {
  const d = time ? new Date(time) : new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function formatTokens(count: number): string {
  if (count < 1000) return `${count} tok`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K tok`;
  return `${(count / 1000000).toFixed(1)}M tok`;
}

export function elapsed(start: number): string {
  const seconds = Math.floor((Date.now() - start) / 1000);
  if (seconds < 60) return `00:${String(seconds).padStart(2, '0')}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

export function extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
  const blocks: Array<{ language: string; code: string }> = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ language: match[1] || 'text', code: match[2].trim() });
  }
  return blocks;
}

export function formatPromptLabel(provider: string, model: string): string {
  return `${provider}/${model}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function indent(text: string, spaces: number = 2): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => pad + line)
    .join('\n');
}

export function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > width) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ' ' + word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.join('\n');
}

export function stripCodeFences(text: string): string {
  return text.replace(/^```\w*\n?|```$/gm, '').trim();
}
