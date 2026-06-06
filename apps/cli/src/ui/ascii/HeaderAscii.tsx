import React from 'react';
import { Text, Box } from 'ink';

const LOGO_LINES = [
  '   ╔═══════════════════════════════════════════╗',
  '   ║            ██████╗ ██████╗ ███████╗███╗  ║',
  '   ║           ██╔═══██╗██╔══██╗██╔════╝████╗ ║',
  '   ║           ██║   ██║██████╔╝█████╗  ██╔██╗ ║',
  '   ║           ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗ ║',
  '   ║           ╚██████╔╝██║     ███████╗██║ ╚██╗║',
  '   ║            ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝║',
  '   ║                 🧠  v1.0.0                 ║',
  '   ╚═══════════════════════════════════════════╝',
];

const LOGO_COLORS: Array<keyof typeof COLOR_MAP> = [
  'cyan', 'cyan', 'cyan', 'cyan', 'cyan', 'cyan', 'cyan', 'cyan',
];

const COLOR_MAP = {
  cyan: 'cyan',
  green: 'green',
  yellow: 'yellow',
  magenta: 'magenta',
  blue: 'blue',
  red: 'red',
  white: 'white',
} as const;

interface HeaderAsciiProps {
  showLogo?: boolean;
  subtitle?: string;
}

export function renderLogo(): string {
  return LOGO_LINES.join('\n');
}

export const HeaderAscii: React.FC<HeaderAsciiProps> = ({
  showLogo = true,
  subtitle = 'AI-Powered CLI Coding Assistant',
}) => {
  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      {showLogo && (
        <Box flexDirection="column">
          {LOGO_LINES.map((line, i) => (
            <Text key={i} color={LOGO_COLORS[i]} bold={i < 7}>
              {line}
            </Text>
          ))}
        </Box>
      )}
      <Box>
        <Text color="gray" dimColor>
          {subtitle}
        </Text>
      </Box>
    </Box>
  );
};

export default HeaderAscii;
