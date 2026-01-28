/**
 * Core Navigation Logic
 * 
 * Pure functions for calculating list navigation.
 */

/**
 * [PURE] Calculate new index for list navigation.
 * Returns boundary info for caller to handle.
 *
 * Direction: 'up' | 'down' | 'top' | 'bottom'
 *
 * Examples:
 *   navigateList('down', 2, 10)   => { index: 3, boundary: null }
 *   navigateList('down', 9, 10)   => { index: 9, boundary: 'bottom' }
 *   navigateList('up', 0, 10)     => { index: 0, boundary: 'top' }
 *   navigateList('top', 5, 10)    => { index: 0, boundary: null }
 *   navigateList('bottom', 5, 10) => { index: 9, boundary: null }
 *   navigateList('down', 0, 0)    => { index: 0, boundary: null }  // Empty list
 */
export function navigateList(direction, currentIndex, count) {
  // Handle empty list
  if (count === 0) {
    return { index: 0, boundary: null };
  }
  
  const maxIndex = count - 1;
  
  switch (direction) {
    case 'up':
      if (currentIndex <= 0) {
        return { index: 0, boundary: 'top' };
      }
      return { index: currentIndex - 1, boundary: null };
      
    case 'down':
      if (currentIndex >= maxIndex) {
        return { index: maxIndex, boundary: 'bottom' };
      }
      return { index: currentIndex + 1, boundary: null };
      
    case 'top':
      return { index: 0, boundary: null };
      
    case 'bottom':
      return { index: maxIndex, boundary: null };
      
    default:
      return { index: currentIndex, boundary: null };
  }
}

/**
 * [PURE] Calculate new index for half-page scroll (Ctrl+d, Ctrl+u).
 * Returns new index.
 *
 * Direction: 'up' | 'down'
 *
 * Examples:
 *   scrollHalfPage('down', 5, 100, 20)  => 15   // Move down ~10 items (half of 20)
 *   scrollHalfPage('up', 15, 100, 20)   => 5    // Move up ~10 items
 *   scrollHalfPage('down', 95, 100, 20) => 99   // Clamped to max
 *   scrollHalfPage('up', 3, 100, 20)    => 0    // Clamped to min
 */
export function scrollHalfPage(direction, currentIndex, count, visibleCount) {
  if (count === 0) return 0;
  
  const half = Math.floor(visibleCount / 2);
  const maxIndex = count - 1;
  
  let newIndex;
  if (direction === 'down') {
    newIndex = currentIndex + half;
  } else {
    newIndex = currentIndex - half;
  }
  
  // Clamp to valid range
  return Math.max(0, Math.min(maxIndex, newIndex));
}
