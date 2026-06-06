import React from 'react';
import { Text, Box } from 'ink';
import { HeaderAscii } from './HeaderAscii.js';
import { FileTree } from './FileTree.js';
import type { FileEntry } from './FileTree.js';
import { StatusBar } from './StatusBar.js';

interface WorkspaceViewProps {
  workspaceName: string;
  workspacePath: string;
  files: FileEntry[];
  currentVersion?: string;
  latestVersion?: string | null;
  pluginCount?: number;
  activeModel?: string;
  activeProvider?: string;
  showLogo?: boolean;
  statusMessage?: string;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  workspaceName,
  workspacePath,
  files,
  currentVersion,
  latestVersion,
  pluginCount,
  activeModel,
  activeProvider,
  showLogo = true,
  statusMessage,
}) => {
  return (
    <Box flexDirection="column" width="100%">
      <HeaderAscii showLogo={showLogo} />

      <Box
        borderStyle="double"
        borderColor="cyan"
        flexDirection="column"
        paddingX={1}
        marginY={1}
      >
        <Box>
          <Text bold color="cyan">
            {'\u{1F4C1}'} Workspace: {workspaceName}
          </Text>
        </Box>
        <Box>
          <Text dimColor>{workspacePath}</Text>
        </Box>
      </Box>

      <Box
        borderStyle="single"
        borderColor="gray"
        flexDirection="column"
        paddingX={1}
        marginBottom={1}
      >
        <Box marginBottom={1}>
          <Text bold color="green">
            {'\u{1F4C2}'} Project Files
          </Text>
        </Box>
        <FileTree entries={files} maxDepth={5} />
      </Box>

      {statusMessage && (
        <Box
          borderStyle="round"
          borderColor="green"
          paddingX={1}
          marginY={1}
        >
          <Text color="green">
            {'\u2139'} {statusMessage}
          </Text>
        </Box>
      )}

      <Box
        borderStyle="single"
        borderColor="gray"
        flexDirection="column"
        paddingX={1}
      >
        <Text dimColor>
          {'\u{1F4DD}'} Quick Actions:
        </Text>
        <Text dimColor>
          {'  '}openio exec {'<command>'}  {'  '}openio read {'<file>'}
        </Text>
        <Text dimColor>
          {'  '}openio write {'<file> <content>'}  {'  '}openio tree
        </Text>
      </Box>

      <StatusBar
        currentVersion={currentVersion}
        latestVersion={latestVersion}
        workspaceName={workspaceName}
        pluginCount={pluginCount}
        activeModel={activeModel}
        activeProvider={activeProvider}
      />
    </Box>
  );
};

export default WorkspaceView;
