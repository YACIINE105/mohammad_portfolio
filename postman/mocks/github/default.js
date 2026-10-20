const http = require('node:http');

// Contract fixture based on GitHub's documented search-commits response.
// These synthetic records are used only by the local simulation.
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const reply = (status, body, headers = {}) => {
    response.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    response.end(JSON.stringify(body));
  };
  if (request.method !== 'GET' || url.pathname !== '/search/commits') {
    reply(501, { message: 'Endpoint not modeled by this contract fixture.' });
    return;
  }
  if (url.searchParams.get('sort') !== 'author-date' || url.searchParams.get('order') !== 'desc' || url.searchParams.get('per_page') !== '6' || request.headers.accept !== 'application/vnd.github+json') {
    reply(422, { message: 'Invalid commit-search request.' });
    return;
  }
  const scenario = url.searchParams.get('q');
  if (scenario === 'author:fixture-limited') {
    reply(403, { message: 'API rate limit exceeded.' }, { 'Retry-After': '120', 'X-RateLimit-Remaining': '0' });
    return;
  }
  if (scenario === 'author:fixture-html') {
    response.writeHead(502, { 'Content-Type': 'text/html' });
    response.end('<html>Upstream unavailable</html>');
    return;
  }
  if (scenario === 'author:fixture-timeout') {
    setTimeout(() => reply(200, { total_count: 0, incomplete_results: false, items: [] }), 500);
    return;
  }
  if (scenario === 'author:fixture-empty') {
    reply(200, { total_count: 0, incomplete_results: false, items: [] });
    return;
  }
  const commit = (sha, date, message) => ({ sha, commit: { author: { date }, message }, repository: { full_name: 'fixture/example' } });
  const items = [
    commit('a'.repeat(40), '2026-10-19T09:00:00Z', 'Earlier change'),
    commit('b'.repeat(40), '2026-10-20T09:00:00Z', 'Latest change\nDetailed body'),
    commit('b'.repeat(40), '2026-10-20T09:00:00Z', 'Latest change\nDetailed body')
  ];
  if (scenario === 'author:fixture-malformed') items[0].commit.author.date = 'invalid';
  reply(200, { total_count: 2, incomplete_results: scenario === 'author:fixture-incomplete', items });
});
server.listen(process.env.PORT || 4500);
