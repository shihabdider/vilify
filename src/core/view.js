// DOM utilities - View/DOM functions for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

/**
 * Create DOM element with attributes and children.
 * Does not attach event handlers (pure).
 * [PURE]
 *
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set
 * @param {Array} children - Child elements or text strings
 * @returns {HTMLElement}
 *
 * @example
 * el('div', { class: 'container' }, [])
 *   => <div class="container"></div>
 *
 * el('span', { id: 'msg' }, ['Hello'])
 *   => <span id="msg">Hello</span>
 *
 * el('ul', {}, [el('li', {}, ['One']), el('li', {}, ['Two'])])
 *   => <ul><li>One</li><li>Two</li></ul>
 */
export function el(tag, attrs = {}, children = []) {
  // Template: Create element, apply attributes, append children
  const element = document.createElement(tag);

  // Apply attributes
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }

  // Append children (strings become text nodes, elements appended directly)
  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * Remove all children from an element.
 * [I/O]
 *
 * @param {HTMLElement} element - Element to clear
 *
 * @example
 * clear(container)  // container.innerHTML = ''
 */
export function clear(element) {
  // Template: DOM mutation
  element.innerHTML = '';
}

/**
 * Update visual selection state (add/remove .selected class).
 * Scrolls selected item into view.
 * [I/O]
 *
 * @param {HTMLElement} container - Container element
 * @param {string} selector - CSS selector for items
 * @param {number} index - Index of item to select
 *
 * @example
 * updateListSelection(container, '.item', 4)
 * // Removes .selected from old item, adds to item at index 4, scrolls into view
 */
export function updateListSelection(container, selector, index) {
  // Template: DOM query and mutation
  const items = container.querySelectorAll(selector);

  // Remove .selected from all items
  for (const item of items) {
    item.classList.remove('selected');
  }

  // Add .selected to item at index and scroll into view
  if (items[index]) {
    items[index].classList.add('selected');
    items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/**
 * Display a toast message in status bar.
 * Auto-clears after timeout.
 * [I/O]
 *
 * Note: For now, uses console.log as placeholder until status bar is implemented.
 *
 * @param {string} msg - Message to display
 *
 * @example
 * showMessage("Copied URL")   // Shows toast, auto-clears after timeout
 * showMessage("")             // Clears immediately
 */
export function showMessage(msg) {
  // Template: I/O - side effect (display message)
  // Placeholder: using console.log until status bar UI is implemented
  if (msg) {
    console.log('[Vilify]', msg);
  }
}

/**
 * Flash the content area to indicate list boundary reached.
 * [I/O]
 *
 * @example
 * flashBoundary()  // Brief CSS animation
 */
export function flashBoundary() {
  // Template: I/O - DOM animation
  const container = document.querySelector('.vilify-content');
  if (!container) return;

  // Add flash class briefly
  container.classList.add('vilify-boundary-flash');
  setTimeout(() => {
    container.classList.remove('vilify-boundary-flash');
  }, 150);
}

/**
 * Calculate new index for list navigation.
 * Returns boundary info for caller to handle.
 * [PURE]
 *
 * @param {'up' | 'down' | 'top' | 'bottom'} direction - Navigation direction
 * @param {number} index - Current index
 * @param {number} count - Total item count
 * @returns {{ index: number, boundary: 'top' | 'bottom' | null }}
 *
 * @example
 * navigateList('down', 2, 10)   => { index: 3, boundary: null }
 * navigateList('down', 9, 10)   => { index: 9, boundary: 'bottom' }
 * navigateList('up', 0, 10)     => { index: 0, boundary: 'top' }
 * navigateList('top', 5, 10)    => { index: 0, boundary: null }
 * navigateList('bottom', 5, 10) => { index: 9, boundary: null }
 * navigateList('down', 0, 0)    => { index: 0, boundary: null }  // Empty list
 */
export function navigateList(direction, index, count) {
  // Template: Enumeration - case per direction value
  // Handle empty list
  if (count === 0) {
    return { index: 0, boundary: null };
  }

  const maxIndex = count - 1;

  switch (direction) {
    case 'up':
      if (index <= 0) {
        return { index: 0, boundary: 'top' };
      }
      return { index: index - 1, boundary: null };

    case 'down':
      if (index >= maxIndex) {
        return { index: maxIndex, boundary: 'bottom' };
      }
      return { index: index + 1, boundary: null };

    case 'top':
      return { index: 0, boundary: null };

    case 'bottom':
      return { index: maxIndex, boundary: null };

    default:
      return { index, boundary: null };
  }
}

/**
 * Calculate new index for half-page scroll (Ctrl+d, Ctrl+u).
 * Returns new index clamped to valid range.
 * [PURE]
 *
 * @param {'up' | 'down'} direction - Scroll direction
 * @param {number} index - Current index
 * @param {number} count - Total item count
 * @param {number} visibleCount - Number of visible items
 * @returns {number} New index
 *
 * @example
 * scrollHalfPage('down', 5, 100, 20)  => 15   // Move down ~10 items (half of 20)
 * scrollHalfPage('up', 15, 100, 20)   => 5    // Move up ~10 items
 * scrollHalfPage('down', 95, 100, 20) => 99   // Clamped to max
 * scrollHalfPage('up', 3, 100, 20)    => 0    // Clamped to min
 */
export function scrollHalfPage(direction, index, count, visibleCount) {
  // Template: Enumeration - case per direction
  // Half of visible count, minimum 1
  const halfPage = Math.max(1, Math.floor(visibleCount / 2));
  const maxIndex = Math.max(0, count - 1);

  if (direction === 'down') {
    return Math.min(maxIndex, index + halfPage);
  }

  if (direction === 'up') {
    return Math.max(0, index - halfPage);
  }

  // Unknown direction, return current
  return index;
}

/**
 * Check if element is an input/textarea/contenteditable.
 * [PURE]
 *
 * @param {Element} element - Element to check
 * @returns {boolean} True if element captures keyboard input
 *
 * @example
 * isInputElement(document.querySelector('input'))                    => true
 * isInputElement(document.querySelector('div'))                      => false
 * isInputElement(document.querySelector('[contenteditable="true"]')) => true
 */
export function isInputElement(element) {
  // Template: Check element type and attributes
  if (!element) return false;

  const tagName = element.tagName?.toLowerCase();

  // Check for input elements
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  // Check for contenteditable
  if (element.getAttribute?.('contenteditable') === 'true') {
    return true;
  }

  // Check for isContentEditable property (handles inherited contenteditable)
  if (element.isContentEditable) {
    return true;
  }

  return false;
}
