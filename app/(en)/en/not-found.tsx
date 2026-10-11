import NotFound from "next/dist/client/components/builtin/not-found";

/**
 * The 404 boundary for /en. Without one, the notFound() that blocks /en in
 * production falls through to Next's built-in error shell. The body is the
 * same Next 404 piece app/global-not-found.tsx uses; the layout around it
 * supplies the Korean document shell in production.
 */
export default function EnglishNotFound() {
  return <NotFound />;
}
