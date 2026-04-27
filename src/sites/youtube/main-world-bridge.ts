export const MAIN_WORLD_BRIDGE_MARKER = 'vilify-youtube-main-world-bridge' as const;

export interface MainWorldBridgeEnv {
  window?: Window;
  document?: Document;
}

export interface MainWorldBridgeInitResult {
  kind: 'youtube-main-world-bridge';
  marker: typeof MAIN_WORLD_BRIDGE_MARKER;
  listenersInstalled: false;
}

export function initMainWorldBridge(_env: MainWorldBridgeEnv = {}): MainWorldBridgeInitResult {
  return {
    kind: 'youtube-main-world-bridge',
    marker: MAIN_WORLD_BRIDGE_MARKER,
    listenersInstalled: false,
  };
}

initMainWorldBridge();
