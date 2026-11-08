import { expect, test } from 'bun:test';
import { createDmCipher, generateDmIdentity } from '../src/lib/dm-crypto';

test('verified peers derive the same safety code and decrypt both directions', async () => {
  const [alice,bob]=await Promise.all([generateDmIdentity(),generateDmIdentity()]);
  expect(alice.privateKey.extractable).toBe(false);
  expect(alice.publicKey).toMatch(/^B[A-Za-z0-9_-]{86}$/);
  const [left,right]=await Promise.all([
    createDmCipher(alice,'alice',{profileId:'bob',publicKey:bob.publicKey}),
    createDmCipher(bob,'bob',{profileId:'alice',publicKey:alice.publicKey}),
  ]);
  expect(left.safetyCode).toBe(right.safetyCode);
  const text='Private message 👻';
  const first=await left.encrypt(text);
  const second=await left.encrypt(text);
  expect(first).not.toBe(second);
  expect(first).not.toContain(text);
  expect(await right.decrypt(first,'alice')).toBe(text);
  expect(await left.decrypt(first,'alice')).toBe(text);
  expect(await left.decrypt(await right.encrypt('Reply'),'bob')).toBe('Reply');
  await expect(right.decrypt(first,'bob')).rejects.toThrow();
  const parts=first.split('.');
  parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
  await expect(right.decrypt(parts.join('.'),'alice')).rejects.toThrow();
});

test('changing the peer key changes the safety code and prevents decryption', async () => {
  const [alice,bob,impostor]=await Promise.all([
    generateDmIdentity(),generateDmIdentity(),generateDmIdentity(),
  ]);
  const genuine=await createDmCipher(alice,'alice',{profileId:'bob',publicKey:bob.publicKey});
  const substituted=await createDmCipher(alice,'alice',{profileId:'bob',publicKey:impostor.publicKey});
  expect(genuine.safetyCode).not.toBe(substituted.safetyCode);
  await expect(substituted.decrypt(await genuine.encrypt('Do not disclose'),'alice')).rejects.toThrow();
  await expect(genuine.encrypt('x'.repeat(4001))).rejects.toThrow();
});
