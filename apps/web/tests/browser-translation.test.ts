import { expect, test } from 'bun:test';
import { translateProse } from '../src/lib/browser-translation';

test('article translation preserves code, security identifiers and line structure',async()=>{
  const source='Intro CVE-2026-1234\n\n```sh\necho KeepMe\n```\nUse `rawCommand` and https://example.org then T1059.001.';
  const result=await translateProse(source,async text=>text.toUpperCase());
  expect(result).toBe('INTRO CVE-2026-1234\n\n```sh\necho KeepMe\n```\nUSE `rawCommand` AND https://example.org THEN T1059.001.');
});

test('translation bounds input and keeps all characters when the translator is unchanged',async()=>{
  const input='明'.repeat(3100)+'\n\tindented code\nCWE-79';
  const output=await translateProse(input,async chunk=>{
    expect(Array.from(chunk).length).toBeLessThanOrEqual(1500);
    return chunk;
  });
  expect(output).toBe(input);
});
