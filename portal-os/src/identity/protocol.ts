export function bearerToken(request: Request): string | null {
  const value = request.headers.get('Authorization');
  return value?.startsWith('Bearer ') ? value.slice(7) : null;
}

/** Session validation must be supplied by a real identity provider; no token is trusted here. */
export function hasSovereignSession(_request: Request): false { return false; }
