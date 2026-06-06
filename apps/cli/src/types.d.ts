declare module 'ink-progress-bar' {
  import type { FC } from 'react';
  interface BarProps {
    percent: number;
    columns?: number;
    left?: number;
    right?: number;
    character?: string;
    rightPad?: boolean;
  }
  const Bar: FC<BarProps>;
  export default Bar;
}
