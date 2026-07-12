import { redirect } from "next/navigation";

/**
 * The admin panel used to live here: a second dashboard, with its own sidebar,
 * header and logout, rendered *outside* the /dashboard shell — and linked to
 * from inside it. An admin could end up two dashboards deep, with Guides and
 * Tourists appearing in both and Services, Advertisements, Enquiries and
 * Payments reachable only from this one.
 *
 * All of it now lives under /dashboard/admin, behind the single grouped sidebar.
 * This route survives only to catch old bookmarks and stale links.
 */
export default function LegacyAdminRedirect() {
  redirect("/dashboard/admin");
}
