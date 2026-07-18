import { NextRequest, NextResponse } from "next/server";

/**
 * Edge gate for authenticated areas.
 *
 * Lives in proxy.ts: Next 16 renamed the middleware file convention to "proxy",
 * and keeping the old name builds with a deprecation warning.
 *
 * This is a *presence* check on the session cookie, nothing more. It cannot
 * validate the JWT (the signing secret lives on the API, not here) and it
 * deliberately doesn't try — the backend remains the authoritative enforcement
 * point for both authentication and role checks, and `RoleGuard` /
 * `DashboardLayout` still make the role decision on the client once the session
 * resolves.
 *
 * What this adds is that an anonymous visitor is redirected before any
 * dashboard page is served, instead of downloading the bundle, hydrating,
 * discovering it has no session and only then bouncing. That removes the
 * loader-then-redirect flash, keeps admin page bundles away from the public,
 * and means a signed-out user hitting a bookmarked dashboard URL lands on the
 * sign-in page immediately.
 *
 * A forged cookie gets you a page shell and nothing else: every piece of data on
 * it comes from an API call the backend will reject.
 */

const AUTH_COOKIE = "auth-cookie";
const REFRESH_COOKIE = "refresh-cookie";

// Prefixes that require a session. Everything else is public.
const PROTECTED_PREFIXES = ["/dashboard"];

// Signed-in users have no business on these; send them to their dashboard.
const AUTH_ONLY_PAGES = ["/signin", "/signup", "/login", "/forgot-password"];

export default function proxy(req: NextRequest) {
	const { pathname, search } = req.nextUrl;

	const hasSession =
		Boolean(req.cookies.get(AUTH_COOKIE)?.value) ||
		// An expired access cookie with a live refresh cookie is still a session —
		// the API client transparently refreshes it. Redirecting here would log
		// people out every time their 1-day access token lapsed.
		Boolean(req.cookies.get(REFRESH_COOKIE)?.value);

	const isProtected = PROTECTED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);

	if (isProtected && !hasSession) {
		const url = req.nextUrl.clone();
		url.pathname = "/signin";
		url.search = "";
		url.searchParams.set("message", "Please login to access this page");
		// Come back here after signing in.
		url.searchParams.set("next", `${pathname}${search}`);
		return NextResponse.redirect(url);
	}

	if (hasSession && AUTH_ONLY_PAGES.includes(pathname)) {
		const url = req.nextUrl.clone();
		// Which dashboard depends on the role, which is only knowable client-side.
		// /dashboard/user is the safe landing spot: DashboardLayout redirects a
		// guide or admin onward the moment the session resolves.
		url.pathname = "/dashboard/user";
		url.search = "";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	// Skip Next internals, the API proxy and anything with a file extension, so
	// static assets never pay for this.
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
