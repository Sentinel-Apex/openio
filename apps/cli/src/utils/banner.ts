import chalk from 'chalk';

export function showBanner(): void {
  console.log(chalk.cyan(`
  ╔══════════════════════════════════════╗
  ║        ${chalk.bold('OpenIO')} v${chalk.bold('1.0.0')}         ║
  ║  ${chalk.dim('AI-Powered CLI Assistant')}  ║
  ╚══════════════════════════════════════╝
  `));
}

export function showShortBanner(): void {
  console.log(chalk.cyan(`OpenIO v1.0.0 — ${chalk.dim('AI-Powered CLI Assistant')}`));
}
