export const USER_ID_COOKIE_NAME = "userId";

export function getUserIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) continue;

    const name = cookie.slice(0, separatorIndex).trim();
    if (name !== USER_ID_COOKIE_NAME) continue;

    const value = cookie.slice(separatorIndex + 1).trim();
    return value || null;
  }

  return null;
}
