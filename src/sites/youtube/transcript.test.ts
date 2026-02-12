// Tests for transcript utility functions
import { describe, it, expect } from 'vitest';
import { formatTime } from './transcript';

describe('formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats exactly one minute', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('2:05');
  });

  it('pads seconds with leading zero', () => {
    expect(formatTime(62)).toBe('1:02');
  });

  it('formats exactly one hour', () => {
    expect(formatTime(3600)).toBe('1:00:00');
  });

  it('formats hours with minutes and seconds', () => {
    expect(formatTime(3725)).toBe('1:02:05');
  });

  it('pads minutes and seconds in hour format', () => {
    expect(formatTime(3601)).toBe('1:00:01');
  });

  it('handles large hour values', () => {
    expect(formatTime(36000)).toBe('10:00:00');
  });

  it('truncates fractional seconds (floors)', () => {
    expect(formatTime(45.9)).toBe('0:45');
  });

  it('handles 59 seconds (boundary before minute)', () => {
    expect(formatTime(59)).toBe('0:59');
  });

  it('handles 3599 seconds (boundary before hour)', () => {
    expect(formatTime(3599)).toBe('59:59');
  });
});
