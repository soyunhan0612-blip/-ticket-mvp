export interface BasicAuthResult {
  authenticated: boolean;
}

const UNAUTHENTICATED: BasicAuthResult = { authenticated: false };

export function verifyBasicAuth(
  authorizationHeader: string | null,
  expectedUser: string | undefined,
  expectedPass: string | undefined,
): BasicAuthResult {
  if (
    !authorizationHeader ||
    expectedUser === undefined ||
    expectedUser === "" ||
    expectedPass === undefined ||
    expectedPass === ""
  ) {
    return UNAUTHENTICATED;
  }

  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/.exec(authorizationHeader);
  if (!match) return UNAUTHENTICATED;

  const encoded = match[1];
  if (encoded.length % 4 !== 0) return UNAUTHENTICATED;

  const decoded = Buffer.from(encoded, "base64").toString();
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return UNAUTHENTICATED;

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return { authenticated: user === expectedUser && password === expectedPass };
}

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/") ||
    pathname === "/seller" ||
    pathname.startsWith("/seller/")
  );
}
