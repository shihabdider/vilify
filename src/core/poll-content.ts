/**
 * pollPageContent : SiteConfig, number, number -> Promise<boolean>
 *
 * Look up the page config's waitForContent predicate and poll it.
 *
 * 1. Determine the page type via cfg.getPageType() (defaults to 'other').
 * 2. Look up cfg.pages?.[pageType]?.waitForContent.
 * 3. If a predicate is found, poll it every `interval` ms until it returns
 *    true or `timeout` ms have elapsed.  Return true (meaning "handled").
 * 4. If no predicate is found, return false so the caller can fall through
 *    to legacy behavior.
 *
 * @param {object} cfg       - Site config with optional pages / getPageType
 * @param {number} timeout   - Max wait time in ms (default 5000)
 * @param {number} interval  - Poll interval in ms (default 50)
 * @returns {Promise<boolean>} true if a predicate was found (handled), false otherwise
 */
export async function pollPageContent(
  cfg: { getPageType?: () => string; pages?: Record<string, { waitForContent?: () => boolean; [key: string]: any }>; [key: string]: any },
  timeout: number = 5000,
  interval: number = 50
): Promise<boolean> {
  const pageType = cfg.getPageType ? cfg.getPageType() : 'other';
  const pageConfig = cfg.pages?.[pageType];
  const predicate = pageConfig?.waitForContent;

  if (!predicate) return false;

  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return true;
    await new Promise(r => setTimeout(r, interval));
  }
  // Predicate was found but timed out — still "handled", don't fall through
  return true;
}
