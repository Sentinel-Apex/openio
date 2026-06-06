import React, { useEffect, useState, useRef } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import Bar from 'ink-progress-bar';
import { elapsed } from '../utils/formatting.js';

interface ProcessingIndicatorProps {
  isLoading: boolean;
  isStreaming: boolean;
  startTime: number | null;
  progress?: number;
  message?: string;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  isLoading,
  isStreaming,
  startTime,
  progress,
  message,
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isStreaming && startTime) {
      animFrameRef.current = setInterval(() => {
        const elapsedMs = Date.now() - startTime;
        const simulated = Math.min(elapsedMs / 10000, 0.95);
        setDisplayProgress(progress ?? simulated);
      }, 200);
    } else {
      setDisplayProgress(progress ?? 0);
    }
    return () => {
      if (animFrameRef.current) {
        clearInterval(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isStreaming, startTime, progress]);

  if (!isLoading && !isStreaming) return null;

  const time = startTime ? ` ${elapsed(startTime)}` : '';
  const displayMsg = message ?? (isStreaming ? 'AI is thinking...' : 'Processing...');

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
      marginY={1}
    >
      <Box>
        <Text color="cyan">
          {'\u{1F9E0}'} {displayMsg}
        </Text>
        <Text dimColor> {'\u25CF \u25CF \u25CF'}{time}</Text>
      </Box>
      <Box>
        <Bar
          percent={displayProgress}
          character={'\u2588'}
          rightPad={true}
        />
      </Box>
    </Box>
  );
};

export default ProcessingIndicator;
