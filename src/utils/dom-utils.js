/**
 * DOM Utilities Module
 * Handles DOM manipulation and element interactions
 */

/**
 * Replace inner text of a DOM element by id.
 * @param {string} selector - Element ID
 * @param {string} text - Text to set
 */
export const replaceText = (selector, text) => {
  const element = document.getElementById(selector);
  if (element) element.innerText = text;
};

/**
 * Get a DOM element by ID with optional warning if not found.
 * @param {string} id - Element ID
 * @param {boolean} warnIfMissing - Whether to log warning if element not found
 * @returns {HTMLElement|null}
 */
export function getElementSafely(id, warnIfMissing = true) {
  const element = document.getElementById(id);
  if (!element && warnIfMissing) {
    console.warn(`Element with id '${id}' not found`);
  }
  return element;
}

/**
 * Show or hide a button element.
 * @param {string} id - Button element ID
 * @param {boolean} show - Whether to show (true) or hide (false)
 */
export function toggleButtonVisibility(id, show) {
  const button = getElementSafely(id, true);
  if (button) {
    button.style.display = show ? "inline-block" : "none";
  }
}
