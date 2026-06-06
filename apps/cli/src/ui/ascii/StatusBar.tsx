import React from 'react';
import { Text, Box } from 'ink';

const SEPARATOR = ' \u2502 ';

interface StatusBarProps {
  currentVersion?: string;
  latestVersion?: string | null;
  workspaceName?: string | null;
  pluginCount?: number;
  activeModel?: string;
  activeProvider?: string;
  uptime?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentVersion = '1.0.0',
  latestVersion,
  workspaceName,
  pluginCount = 0,
  activeModel,
  activeProvider,
}) => {
  const segments: Array<{ text: string; color?: string }> = [
    { text: `\u2699 OpenIO v${currentVersion}`, color: 'cyan' },
  ];

  if (latestVersion && latestVersion !== currentVersion) {
    segments.push({ text: `\u2B06 ${latestVersion} available`, color: 'green' });
  }

  if (workspaceName) {
    segments.push({ text: `\u{1F4C1} ${workspaceName}`, color: 'yellow' });
  }

  if (activeProvider && activeModel) {
    segments.push({ text: `${activeProvider}/${activeModel}`, color: 'magenta' });
  }

  if (pluginCount > 0) {
    segments.push({ text: `\u{1F9EC} ${pluginCount} plugin(s)`, color: 'blue' });
  }

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      paddingY={0}
      marginTop={1}
    >
      <Box flexGrow={1}>
        {segments.map((seg, i) => (
          <Box key={i}>
            {i > 0 && <Text dimColor>{SEPARATOR}</Text>}
            <Text color={seg.color ?? 'white'}>
              {seg.text}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default StatusBar;
