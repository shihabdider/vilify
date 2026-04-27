import { describe, expect, it } from 'vitest';
import {
  buildCaptionTrackUrl,
  extractCaptionTracks,
  extractTranscriptParams,
  extractVideoMetadata,
  parseCaptionJson3Transcript,
  parseCaptionXmlTranscript,
  parseInnerTubeTranscript,
} from './transcript-parser';

describe('YouTube structured data extraction', () => {
  it('extracts current video metadata from structured player response videoDetails', () => {
    expect(
      extractVideoMetadata({
        videoDetails: {
          videoId: 'abc123',
          title: 'Structured Video',
          lengthSeconds: '187',
          author: 'Vilify Channel',
          channelId: 'UC_vilify',
          shortDescription: 'A structured description.',
          isLiveContent: false,
        },
      }),
    ).toEqual({
      videoId: 'abc123',
      title: 'Structured Video',
      durationSeconds: 187,
      author: 'Vilify Channel',
      channelId: 'UC_vilify',
      shortDescription: 'A structured description.',
      isLive: false,
    });
  });

  it('extracts InnerTube transcript params from ytInitialData engagement panels', () => {
    const initialData = {
      engagementPanels: [
        {
          engagementPanelSectionListRenderer: {
            targetId: 'engagement-panel-searchable-transcript',
            content: {
              continuationItemRenderer: {
                continuationEndpoint: {
                  getTranscriptEndpoint: {
                    params: 'TRANSCRIPT_PARAMS',
                  },
                },
              },
            },
          },
        },
      ],
    };

    expect(extractTranscriptParams(initialData)).toBe('TRANSCRIPT_PARAMS');
  });

  it('extracts normalized caption tracks from structured player response and normalizes fallback URLs', () => {
    const tracks = extractCaptionTracks({
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              baseUrl: 'https://www.youtube.com/api/timedtext?v=abc123&lang=en',
              name: { runs: [{ text: 'English' }] },
              languageCode: 'en',
              vssId: '.en',
              kind: 'asr',
              isTranslatable: true,
            },
          ],
        },
      },
    });

    expect(tracks).toEqual([
      {
        baseUrl: 'https://www.youtube.com/api/timedtext?v=abc123&lang=en',
        name: 'English',
        languageCode: 'en',
        vssId: '.en',
        kind: 'asr',
        isTranslatable: true,
      },
    ]);

    const json3Url = new URL(buildCaptionTrackUrl(tracks[0], 'json3'));
    expect(json3Url.searchParams.get('v')).toBe('abc123');
    expect(json3Url.searchParams.get('lang')).toBe('en');
    expect(json3Url.searchParams.get('fmt')).toBe('json3');

    const xmlUrl = new URL(
      buildCaptionTrackUrl(
        {
          ...tracks[0],
          baseUrl: 'https://www.youtube.com/api/timedtext?v=abc123&lang=en&fmt=json3',
        },
        'xml',
      ),
    );
    expect(xmlUrl.searchParams.get('fmt')).toBeNull();
  });
});

describe('YouTube transcript parser fixtures', () => {
  it('parses InnerTube get_transcript segment fixtures into normalized lines', () => {
    const response = {
      actions: [
        {
          updateEngagementPanelAction: {
            content: {
              transcriptRenderer: {
                content: {
                  transcriptSearchPanelRenderer: {
                    body: {
                      transcriptSegmentListRenderer: {
                        initialSegments: [
                          {
                            transcriptSegmentRenderer: {
                              startMs: '1200',
                              endMs: '3500',
                              startTimeText: { simpleText: '00:01' },
                              snippet: { runs: [{ text: 'Hello ' }, { text: 'world' }] },
                            },
                          },
                          {
                            transcriptSectionHeaderRenderer: {
                              sectionHeader: { simpleText: 'Chapter' },
                            },
                          },
                          {
                            transcriptSegmentRenderer: {
                              startMs: '61000',
                              endMs: '63000',
                              snippet: { simpleText: 'Second line' },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    };

    expect(parseInnerTubeTranscript(response)).toEqual([
      {
        time: 1.2,
        timeText: '00:01',
        duration: 2.3,
        text: 'Hello world',
      },
      {
        time: 61,
        timeText: '1:01',
        duration: 2,
        text: 'Second line',
      },
    ]);
  });

  it('parses caption XML fixtures with entity decoding', () => {
    const xml = `<transcript>
      <text start="0.5" dur="1.25">Hello &amp; &lt;world&gt;</text>
      <text start="61.2" dur="2">Second\nline</text>
    </transcript>`;

    expect(parseCaptionXmlTranscript(xml)).toEqual([
      {
        time: 0.5,
        timeText: '0:00',
        duration: 1.25,
        text: 'Hello & <world>',
      },
      {
        time: 61.2,
        timeText: '1:01',
        duration: 2,
        text: 'Second line',
      },
    ]);
  });

  it('parses caption fmt=json3 fixtures into normalized lines', () => {
    const json3 = {
      events: [
        { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'First' }, { utf8: ' line' }] },
        { tStartMs: 1000, dDurationMs: 500, segs: [{ utf8: '\n' }] },
        { tStartMs: 2000, segs: [{ utf8: 'No duration' }] },
        { tStartMs: 62500, dDurationMs: 1500, segs: [{ utf8: 'Second' }, { utf8: '\nline' }] },
      ],
    };

    expect(parseCaptionJson3Transcript(json3)).toEqual([
      {
        time: 0,
        timeText: '0:00',
        duration: 1,
        text: 'First line',
      },
      {
        time: 2,
        timeText: '0:02',
        duration: 0,
        text: 'No duration',
      },
      {
        time: 62.5,
        timeText: '1:02',
        duration: 1.5,
        text: 'Second line',
      },
    ]);
  });
});
