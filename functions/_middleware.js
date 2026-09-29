// Hard 404 for repo paths that are not part of the site. An early deployment published the whole
// repo, and Cloudflare's edge cache can keep serving those files for days, so these paths are
// answered here, before any cached file. public/_routes.json limits this code to these paths
// and /api/*, so ordinary pages never run it.
const BLOCKED = /^\/(tools|supabase|lib|workers|functions|node_modules)(\/|$)|^\/(README|SETUP)\.md$|^\/\.(git|env)|^\/package(-lock)?\.json$/i;
export const onRequest = ({ request, next }) => {
  const path = new URL(request.url).pathname;
  if (BLOCKED.test(path)) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store', 'content-type': 'text/plain' } });
  return next();
};
