import type { OmnibarItem } from './types';

export type StatusOmnibarItemInput = Omit<OmnibarItem, 'kind' | 'action'>;

export function createStatusOmnibarItem(input: StatusOmnibarItemInput): OmnibarItem {
  return {
    ...input,
    kind: 'status',
    action: { kind: 'noop' },
  };
}
