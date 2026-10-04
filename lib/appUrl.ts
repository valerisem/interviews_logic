/**
 * An absolute address on the app's public domain. Behind Railway's proxy a route
 * handler's req.url is the internal address (http://localhost:8080), so redirects
 * must be built from APP_BASE_URL rather than the incoming request.
 */
export function appUrl(path: string, requestUrl: string): URL {
  const base = (process.env.APP_BASE_URL || new URL(requestUrl).origin).replace(/\/$/, '');
  return new URL(path, `${base}/`);
}
