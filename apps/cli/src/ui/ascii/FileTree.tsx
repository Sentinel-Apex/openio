import React, { useMemo } from 'react';
import { Text, Box } from 'ink';

export interface FileEntry {
  name: string;
  type: 'file' | 'dir';
  children?: FileEntry[];
}

interface FileTreeProps {
  entries: FileEntry[];
  title?: string;
  maxDepth?: number;
  showHidden?: boolean;
}

const DIR_ICON = '\u{1F4C1}';
const FILE_ICON = '\u{1F4C4}';
const INDENT = '  ';
const BRANCH = '\u2502  ';
const CORNER = '\u2514\u2500\u2500 ';
const PIPE = '\u251C\u2500\u2500 ';

function filterEntries(entries: FileEntry[], showHidden: boolean, maxDepth: number, depth: number): FileEntry[] {
  if (depth >= maxDepth) return [];
  return entries.filter((e) => showHidden || !e.name.startsWith('.'));
}

interface TreeNodeProps {
  entry: FileEntry;
  prefix: string;
  isLast: boolean;
  depth: number;
  maxDepth: number;
  showHidden: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({ entry, prefix, isLast, depth, maxDepth, showHidden }) => {
  const connector = isLast ? CORNER : PIPE;
  const icon = entry.type === 'dir' ? DIR_ICON : FILE_ICON;
  const nameColor = entry.type === 'dir' ? 'cyan' : 'white';

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{prefix}{connector}</Text>
        <Text color={nameColor} bold={entry.type === 'dir'}>
          {' '}{icon} {entry.name}
        </Text>
      </Box>
      {entry.type === 'dir' && entry.children && depth + 1 < maxDepth && (
        <Box flexDirection="column">
          {filterEntries(entry.children, showHidden, maxDepth, depth + 1).map((child, idx, arr) => (
            <TreeNode
              key={child.name}
              entry={child}
              prefix={prefix + (isLast ? '   ' : BRANCH)}
              isLast={idx === arr.length - 1}
              depth={depth + 1}
              maxDepth={maxDepth}
              showHidden={showHidden}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  entries,
  title,
  maxDepth = 4,
  showHidden = false,
}) => {
  const filtered = useMemo(
    () => filterEntries(entries, showHidden, maxDepth, 0),
    [entries, showHidden, maxDepth],
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      {title && (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {DIR_ICON} {title}
          </Text>
        </Box>
      )}
      <Box flexDirection="column">
        {filtered.map((entry, idx, arr) => (
          <TreeNode
            key={entry.name}
            entry={entry}
            prefix=""
            isLast={idx === arr.length - 1}
            depth={0}
            maxDepth={maxDepth}
            showHidden={showHidden}
          />
        ))}
      </Box>
      {filtered.length === 0 && (
        <Box>
          <Text dimColor>(empty)</Text>
        </Box>
      )}
    </Box>
  );
};

export function buildFileEntry(path: string, type: 'file' | 'dir' = 'file', children?: FileEntry[]): FileEntry {
  return { name: path, type, children };
}

export function parseFileTree(
  paths: string[],
  base?: string,
): FileEntry[] {
  const root: FileEntry[] = [];
  const prefix = base ? base.replace(/\\/g, '/').replace(/\/$/, '') + '/' : '';

  for (const p of paths) {
    const normalized = p.replace(/\\/g, '/');
    const relative = normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
    const parts = relative.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let existing = current.find((e) => e.name === part);

      if (!existing) {
        existing = { name: part, type: isLast ? 'file' : 'dir', children: isLast ? undefined : [] };
        current.push(existing);
      }

      if (!isLast && existing) {
        if (!existing.children) existing.children = [];
        current = existing.children;
      }
    }
  }

  return root;
}

export default FileTree;
