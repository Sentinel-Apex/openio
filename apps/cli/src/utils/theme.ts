import chalk, { type ChalkInstance } from 'chalk';
import { loadCLIConfig } from './config.js';

export type Theme = 'dark' | 'light';

export interface ThemeColors {
  primary: ChalkInstance;
  secondary: ChalkInstance;
  success: ChalkInstance;
  warning: ChalkInstance;
  error: ChalkInstance;
  muted: ChalkInstance;
  accent: ChalkInstance;
  border: ChalkInstance;
  userBubble: ChalkInstance;
  aiBubble: ChalkInstance;
  systemBubble: ChalkInstance;
  codeBg: ChalkInstance;
  codeText: ChalkInstance;
  sidebar: ChalkInstance;
  highlight: ChalkInstance;
  dim: ChalkInstance;
}

const darkTheme: ThemeColors = {
  primary: chalk.cyan,
  secondary: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  muted: chalk.gray,
  accent: chalk.magenta,
  border: chalk.cyan,
  userBubble: chalk.green,
  aiBubble: chalk.cyan,
  systemBubble: chalk.yellow,
  codeBg: chalk.bgBlack,
  codeText: chalk.green,
  sidebar: chalk.cyan,
  highlight: chalk.bold,
  dim: chalk.dim,
};

const lightTheme: ThemeColors = {
  primary: chalk.cyan,
  secondary: chalk.blueBright,
  success: chalk.greenBright,
  warning: chalk.yellowBright,
  error: chalk.redBright,
  muted: chalk.gray,
  accent: chalk.magentaBright,
  border: chalk.cyanBright,
  userBubble: chalk.green,
  aiBubble: chalk.cyan,
  systemBubble: chalk.yellow,
  codeBg: chalk.bgWhite,
  codeText: chalk.black,
  sidebar: chalk.cyanBright,
  highlight: chalk.bold,
  dim: chalk.dim,
};

export function getThemeColors(theme: Theme): ThemeColors {
  return theme === 'light' ? lightTheme : darkTheme;
}

export function detectTheme(): Theme {
  const config = loadCLIConfig();
  if (config.theme) return config.theme;
  if (typeof process !== 'undefined' && process.env.COLORFGBG) {
    const bg = process.env.COLORFGBG.split(';').pop();
    if (bg && parseInt(bg, 10) < 8) return 'light';
  }
  if (typeof globalThis !== 'undefined' && 'matchMedia' in globalThis) {
    const mq = (globalThis as any).matchMedia('(prefers-color-scheme: dark)');
    if (mq) return mq.matches ? 'dark' : 'light';
  }
  try {
    const { execSync } = require('child_process');
    const result = execSync('defaults read -g AppleInterfaceStyle 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' });
    return result.trim() === 'Dark' ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export const THEME_CYAN = chalk.cyan;
export const THEME_GREEN = chalk.green;
export const THEME_YELLOW = chalk.yellow;
export const THEME_RED = chalk.red;
export const THEME_GRAY = chalk.gray;
export const THEME_BOLD = chalk.bold;
export const THEME_DIM = chalk.dim;

export const ROLE_ICONS: Record<string, string> = {
  user: '👤',
  assistant: '🤖',
  system: '⚙️',
  tool: '🔧',
};
