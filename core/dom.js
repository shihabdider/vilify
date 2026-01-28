/**
 * Core DOM Utilities
 * 
 * Low-level DOM manipulation helpers.
 */

/** Timer for auto-clearing messages */
let messageTimer = null;

/**
 * [PURE] Create DOM element with attributes and children.
 * Does not attach event handlers (pure).
 *
 * Examples:
 *   el('div', { class: 'container' }, [])
 *     => <div class="container"></div>
 *
 *   el('span', { id: 'msg' }, ['Hello'])
 *     => <span id="msg">Hello</span>
 *
 *   el('ul', {}, [el('li', {}, ['One']), el('li', {}, ['Two'])])
 *     => <ul><li>One</li><li>Two</li></ul>
 */
export function el(tag, attrs, children) {
  const element = document.createElement(tag);
  
  // Set attributes
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }
  
  // Append children
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
 * [I/O] Remove all children from an element.
 *
 * Examples:
 *   clear(container)  // container.innerHTML = '' equivalent
 */
export function clear(element) {
  element.innerHTML = '';
}

/**
 * [I/O] Update visual selection state (add/remove `.selected` class).
 * Scrolls selected item into view.
 *
 * Examples:
 *   updateListSelection(container, '.item', 4)
 *   // Removes .selected from old item, adds to item at index 4, scrolls into view
 */
export function updateListSelection(container, selector, index) {
  const items = container.querySelectorAll(selector);
  
  // Remove .selected from all
  items.forEach(item => item.classList.remove('selected'));
  
  // Add .selected to item at index
  if (index >= 0 && index < items.length) {
    const selectedItem = items[index];
    selectedItem.classList.add('selected');
    selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/**
 * [I/O] Display a message in the status bar.
 * Replaces any existing message and resets auto-clear timer.
 *
 * Examples:
 *   showMessage("Copied URL")   // Shows message, auto-clears after timeout
 *   showMessage("")             // Clears immediately
 */
export function showMessage(message) {
  const msgElement = document.querySelector('.vilify-message');
  if (!msgElement) return;
  
  msgElement.textContent = message;
  
  // Clear existing timer
  if (messageTimer) {
    clearTimeout(messageTimer);
    messageTimer = null;
  }
  
  // Set new timer to clear (if message non-empty)
  if (message) {
    messageTimer = setTimeout(() => {
      msgElement.textContent = '';
      messageTimer = null;
    }, 3000);
  }
}

/**
 * [I/O] Flash the content area to indicate list boundary reached.
 *
 * Examples:
 *   flashBoundary()  // Brief CSS animation
 */
export function flashBoundary() {
  const content = document.querySelector('.vilify-content');
  if (!content) return;
  
  content.classList.add('flash-end');
  setTimeout(() => content.classList.remove('flash-end'), 150);
}
