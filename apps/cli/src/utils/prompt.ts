export { input, select, confirm, password, checkbox } from '@inquirer/prompts';
import { input, select, confirm, password, checkbox } from '@inquirer/prompts';

export async function askInput(message: string, opts?: { default?: string; required?: boolean }): Promise<string> {
  return input({ message, default: opts?.default, required: opts?.required });
}

export async function askSelect<T extends string>(message: string, choices: { name: string; value: T }[]): Promise<T> {
  return select({ message, choices });
}

export async function askConfirm(message: string, defaultValue = false): Promise<boolean> {
  return confirm({ message, default: defaultValue });
}

export async function askPassword(message: string): Promise<string> {
  return password({ message });
}

export async function askCheckbox<T extends string>(message: string, choices: { name: string; value: T }[]): Promise<T[]> {
  return checkbox({ message, choices });
}
