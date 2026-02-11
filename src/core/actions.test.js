// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock layout.js before importing actions
vi.mock('./layout.js', () => ({
  updateStatusMessage: vi.fn(),
}));

import { copyImageToClipboard } from './actions.js';
import { updateStatusMessage } from './layout.js';

describe('copyImageToClipboard', () => {
  let originalFetch;
  let originalClipboard;
  let originalImage;
  let originalClipboardItem;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Mock navigator.clipboard.write
    originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: vi.fn().mockResolvedValue(undefined), writeText: vi.fn() },
      writable: true,
      configurable: true,
    });

    // Polyfill ClipboardItem for jsdom
    originalClipboardItem = globalThis.ClipboardItem;
    globalThis.ClipboardItem = class ClipboardItem {
      constructor(items) {
        this._items = items;
        this.types = Object.keys(items);
      }
    };

    // Mock fetch
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn();

    // Mock Image for canvas conversion path
    originalImage = globalThis.Image;
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    globalThis.ClipboardItem = originalClipboardItem;
    globalThis.fetch = originalFetch;
    globalThis.Image = originalImage;
  });

  it('copies PNG blob directly to clipboard and returns true', async () => {
    const pngBlob = new Blob(['fake-png'], { type: 'image/png' });
    globalThis.fetch.mockResolvedValue({ blob: () => Promise.resolve(pngBlob) });

    const result = await copyImageToClipboard('https://example.com/image.png');

    expect(result).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/image.png');
    expect(navigator.clipboard.write).toHaveBeenCalledWith([
      expect.any(ClipboardItem),
    ]);
    // Verify the ClipboardItem was created with the PNG blob
    const clipboardItem = navigator.clipboard.write.mock.calls[0][0][0];
    expect(clipboardItem.types).toContain('image/png');
  });

  it('shows success status message and auto-clears after 2s', async () => {
    const pngBlob = new Blob(['fake-png'], { type: 'image/png' });
    globalThis.fetch.mockResolvedValue({ blob: () => Promise.resolve(pngBlob) });

    await copyImageToClipboard('https://example.com/image.png');

    expect(updateStatusMessage).toHaveBeenCalledWith('Image copied to clipboard');

    // Message not yet cleared
    expect(updateStatusMessage).not.toHaveBeenCalledWith('');

    // Advance timers by 2 seconds
    vi.advanceTimersByTime(2000);
    expect(updateStatusMessage).toHaveBeenCalledWith('');
  });

  it('converts non-PNG blob via canvas and copies to clipboard', async () => {
    const jpegBlob = new Blob(['fake-jpeg'], { type: 'image/jpeg' });
    const convertedPngBlob = new Blob(['converted-png'], { type: 'image/png' });
    globalThis.fetch.mockResolvedValue({ blob: () => Promise.resolve(jpegBlob) });

    // Mock Image + canvas for conversion path
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      toBlob: vi.fn((callback) => callback(convertedPngBlob)),
    };

    // Mock document.createElement to return our mock canvas
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return mockCanvas;
      return origCreateElement(tag);
    });

    // Mock Image constructor
    globalThis.Image = class {
      constructor() {
        this.onload = null;
        this.onerror = null;
        this.crossOrigin = null;
        setTimeout(() => {
          this.naturalWidth = 100;
          this.naturalHeight = 50;
          if (this.onload) this.onload();
        }, 0);
      }
      set src(val) {
        this._src = val;
      }
      get src() {
        return this._src;
      }
    };

    const resultPromise = copyImageToClipboard('https://example.com/photo.jpg');
    // Let the Image onload fire
    await vi.advanceTimersByTimeAsync(1);
    const result = await resultPromise;

    expect(result).toBe(true);
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(navigator.clipboard.write).toHaveBeenCalled();
    expect(updateStatusMessage).toHaveBeenCalledWith('Image copied to clipboard');

    document.createElement.mockRestore();
  });

  it('returns false and shows failure message on fetch error', async () => {
    globalThis.fetch.mockRejectedValue(new Error('Network error'));

    const result = await copyImageToClipboard('https://example.com/broken.png');

    expect(result).toBe(false);
    expect(updateStatusMessage).toHaveBeenCalledWith('Failed to copy image');

    vi.advanceTimersByTime(2000);
    expect(updateStatusMessage).toHaveBeenCalledWith('');
  });

  it('returns false and shows failure message on clipboard write error', async () => {
    const pngBlob = new Blob(['fake-png'], { type: 'image/png' });
    globalThis.fetch.mockResolvedValue({ blob: () => Promise.resolve(pngBlob) });
    navigator.clipboard.write.mockRejectedValue(new Error('Clipboard denied'));

    const result = await copyImageToClipboard('https://example.com/image.png');

    expect(result).toBe(false);
    expect(updateStatusMessage).toHaveBeenCalledWith('Failed to copy image');

    vi.advanceTimersByTime(2000);
    expect(updateStatusMessage).toHaveBeenCalledWith('');
  });

  it('handles data URI as image source', async () => {
    const pngBlob = new Blob(['fake-png'], { type: 'image/png' });
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    globalThis.fetch.mockResolvedValue({ blob: () => Promise.resolve(pngBlob) });

    const result = await copyImageToClipboard(dataUri);

    expect(result).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(dataUri);
    expect(navigator.clipboard.write).toHaveBeenCalled();
  });
});
