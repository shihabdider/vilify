import {
  YOUTUBE_BRIDGE_REQUEST_EVENT,
  YOUTUBE_BRIDGE_RESPONSE_EVENT,
  type YouTubeBridgeRequest,
  type YouTubeBridgeResponse,
} from '../sites/youtube/bridge-types';

export function recordYouTubeBridgeRequests(document: Document): YouTubeBridgeRequest[] {
  const requests: YouTubeBridgeRequest[] = [];
  document.addEventListener(YOUTUBE_BRIDGE_REQUEST_EVENT, (event) => {
    requests.push((event as CustomEvent<YouTubeBridgeRequest>).detail);
  });
  return requests;
}

export function dispatchYouTubeBridgeResponse(
  document: Document,
  response: YouTubeBridgeResponse,
): void {
  const CustomEventCtor = document.defaultView?.CustomEvent ?? CustomEvent;
  document.dispatchEvent(new CustomEventCtor(YOUTUBE_BRIDGE_RESPONSE_EVENT, { detail: response }));
}
