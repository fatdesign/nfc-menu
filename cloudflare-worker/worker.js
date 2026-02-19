// ============================================
// SHAKER MENU - CLOUDFLARE WORKER PROXY
// ============================================
// Deploy this to Cloudflare Workers (free).
// Set these Environment Variables in the
// Cloudflare Dashboard (never in code!):
//
//   ADMIN_PASSWORD  → e.g. "shaker2024"
//   GITHUB_TOKEN    → ghp_...
//   GITHUB_OWNER    → your-github-username
//   GITHUB_REPO     → your-repo-name
//   ALLOWED_ORIGIN  → https://username.github.io
// ============================================

export default {
    async fetch(request, env) {

        // --- CORS Preflight ---
        if (request.method === 'OPTIONS') {
            return corsResponse(null, 204, env);
        }

        // --- Validate Admin Password ---
        const password = request.headers.get('X-Admin-Password');
        if (!password || password !== env.ADMIN_PASSWORD) {
            return corsResponse(JSON.stringify({ error: 'Unauthorized' }), 401, env);
        }

        const githubApiUrl =
            `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/menu.json`;

        const githubHeaders = {
            'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ShakerMenuAdmin/1.0',
            'Content-Type': 'application/json',
        };

        // --- GET: Load current menu from GitHub ---
        if (request.method === 'GET') {
            const res = await fetch(githubApiUrl, { headers: githubHeaders });
            const data = await res.text();
            return corsResponse(data, res.status, env);
        }

        // --- POST: Save updated menu to GitHub ---
        if (request.method === 'POST') {
            const body = await request.json();

            if (!body.content || !body.sha) {
                return corsResponse(
                    JSON.stringify({ error: 'Fehlende Felder: content und sha' }),
                    400, env
                );
            }

            const res = await fetch(githubApiUrl, {
                method: 'PUT',
                headers: githubHeaders,
                body: JSON.stringify({
                    message: 'Admin: Speisekarte aktualisiert',
                    content: body.content,
                    sha: body.sha,
                }),
            });

            const data = await res.text();
            return corsResponse(data, res.status, env);
        }

        return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, env);
    }
};

// Helper: adds CORS headers to every response
function corsResponse(body, status, env) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    };

    return new Response(body, { status, headers });
}
