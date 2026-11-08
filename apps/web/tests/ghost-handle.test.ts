import { describe, expect, test } from 'bun:test';
import { decodeGhostProfileSlug, ghostProfilePath, validNewGhostHandle } from '../src/lib/ghost-handle';

describe('LGN permanent handles', () => {
  test('double slash is a deliberate valid part of a handle', () => {
    for (const h of ['Laughing//Ghost','null//ghost','A//','Ghost//One','Ghost!One','Night+Shift#42']) {
      expect(validNewGhostHandle(h)).toBe(true);
    }
  });
  test('single slash, triple slash, whitespace and unsafe syntax are rejected', () => {
    for (const h of ['Bad/Ghost','Bad///Ghost','Bad////Ghost','/Bad','Ghost/','Ghost With Space','A','//','Ghost%2F','Ghost?Thing']) {
      expect(validNewGhostHandle(h)).toBe(false);
    }
  });
  test('length boundaries and casing are preserved', () => {
    expect(validNewGhostHandle('Ab3')).toBe(true);
    expect(validNewGhostHandle('G'.repeat(40))).toBe(true);
    expect(validNewGhostHandle('G'.repeat(41))).toBe(false);
    expect(validNewGhostHandle('Laughing//Ghost')).toBe(true);
  });
  test('routing never places literal slash separators in a handle slug', () => {
    const url=ghostProfilePath('Laughing//Ghost');
    expect(url).toBe('/ghosts/Laughing~2F~2FGhost');
    expect(url.split('/')).toHaveLength(3);
    const slug=decodeURIComponent(url.split('/').at(-1)!);
    expect(decodeGhostProfileSlug(slug)).toBe('Laughing//Ghost');
  });
  test('tilde escaping is unambiguous with literal tilde-two-F strings', () => {
    for (const h of ['Ghost~2F','Ghost~7E','Ghost//~2F','Night+Shift#42','Ghost!One','null//ghost']) {
      const slug=decodeURIComponent(ghostProfilePath(h).slice('/ghosts/'.length));
      expect(decodeGhostProfileSlug(slug)).toBe(h);
    }
  });
});
