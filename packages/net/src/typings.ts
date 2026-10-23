export interface CookieType {
  /** Cookie name */
  name: string;
  /** Cookie value */
  value: string;
  /** Cookie path */
  path?: string | undefined;
  /** Absolute expiration date for the cookie */
  expires?: Date | undefined;
  /**
   * Relative max age of the cookie in seconds from when the client receives it (integer or
   * undefined) Note: when using with express's res.cookie() method, multiply maxAge by 1000 to
   * convert to milliseconds
   */
  maxAge?: number | undefined;
  /** Domain for the cookie, may begin with "." to indicate the named domain or any subdomain of it */
  domain?: string | undefined;
  /**
   * Whether the cookie is host-only
   *
   * A cookie received without a `Domain` attribute is host-only: it must only be sent to the exact
   * host that set it, never to its subdomains.
   *
   * @see https://www.rfc-editor.org/rfc/rfc6265#section-5.3
   */
  hostOnly?: boolean | undefined;
  /** Indicates that this cookie should only be sent over HTTPs */
  secure?: boolean | undefined;
  /** Indicates that this cookie should not be accessible to client-side JavaScript */
  httpOnly?: boolean | undefined;
  /** Indicates a cookie ought not to be sent along with cross-site requests */
  sameSite?: boolean | "lax" | "strict" | "none" | undefined;
}
