export type OpenOmnibarKeyIntent = 'move-up' | 'move-down' | 'execute' | 'escape';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

export function isEditableTarget(target: EventTarget | null): boolean {
  const element = elementFromTarget(target);
  if (!element) {
    return false;
  }

  if (element.closest('input, textarea, select')) {
    return true;
  }

  return hasEditableContentAncestor(element);
}

export function isOmnibarOpenerKey(event: KeyboardEvent): boolean {
  return event.key === ':' && !event.altKey && !event.ctrlKey && !event.metaKey;
}

export function getOpenOmnibarKeyIntent(event: KeyboardEvent): OpenOmnibarKeyIntent | null {
  switch (event.key) {
    case 'ArrowUp':
      return 'move-up';
    case 'ArrowDown':
      return 'move-down';
    case 'Enter':
      return 'execute';
    case 'Escape':
      return 'escape';
    default:
      return null;
  }
}

function elementFromTarget(target: EventTarget | null): Element | null {
  if (!target || typeof (target as Node).nodeType !== 'number') {
    return null;
  }

  const node = target as Node;
  if (node.nodeType === ELEMENT_NODE) {
    return node as Element;
  }

  if (node.nodeType === TEXT_NODE) {
    return node.parentElement;
  }

  return null;
}

function hasEditableContentAncestor(element: Element): boolean {
  let current: Element | null = element;

  while (current) {
    const contentEditable = current.getAttribute('contenteditable');
    if (contentEditable !== null) {
      return contentEditable.toLowerCase() !== 'false';
    }

    current = current.parentElement;
  }

  return false;
}
