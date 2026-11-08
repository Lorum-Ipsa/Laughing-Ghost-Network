/**
 * LGN public Ghost handles are display identities, not filesystem paths.
 * A literal "//" must never become two URL path separators.
 *
 * "~" is escaped first to "~7E", then each slash to "~2F", making the
 * encoding reversible even when a member types the literal "~2F".
 * Other reserved URL characters are percent-encoded by encodeURIComponent.
 */
export function ghostProfilePath(handle: string): string {
  const slug = handle.replace(/~/g, '~7E').replace(/\//g, '~2F');
  return '/ghosts/' + encodeURIComponent(slug);
}

/** React Router already percent-decodes the route parameter. */
export function decodeGhostProfileSlug(slug: string): string {
  return slug.replace(/~(?:2F|7E)/g, token => token === '~2F' ? '/' : '~');
}

/** Only paired slashes are valid; a run of three or more is prohibited. */
export const HANDLE_PATTERN = /^[A-Za-z0-9](?!.*\/\/\/)(?:[A-Za-z0-9._!@#$&+~\-]|\/\/){1,39}$/;

export function validNewGhostHandle(handle: string): boolean {
  return handle.length >= 3 && handle.length <= 40 && HANDLE_PATTERN.test(handle);
}
