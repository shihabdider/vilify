import type { OmnibarCommandPrefix } from './types';

const OMNIBAR_COMMAND_PREFIXES: readonly OmnibarCommandPrefix[] = ['s/', 't/', 'n/'];

export function getOmnibarCommandPrefix(query: string): OmnibarCommandPrefix | null {
  return OMNIBAR_COMMAND_PREFIXES.find((prefix) => query.startsWith(prefix)) ?? null;
}
