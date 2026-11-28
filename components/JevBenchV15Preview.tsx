import type { ComponentProps } from 'react';
import { JevBenchV15View } from './JevBenchV15View';
import { JevBoardIntentLinks } from './JevBenchSeoBlocks';
export { Sha } from './JevBenchV15View';

/** Preserve the server render path for existing callers; archive clients use the same pure view. */
export function JevBenchV15(props: Omit<ComponentProps<typeof JevBenchV15View>, 'guides'>) {
  return <JevBenchV15View {...props} guides={<JevBoardIntentLinks />} />;
}
export const JevBenchV15Preview = JevBenchV15;
