const http = require('node:http');

// Contract fixture based on GitHub's documented search-commits and search-issues response.
// These synthetic records are used only by the local simulation.
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const reply = (status, body, headers = {}) => {
    response.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    response.end(JSON.stringify(body));
  };
  if (request.method !== 'GET') {
    reply(501, { message: 'Endpoint not modeled by this contract fixture.' });
    return;
  }
  if (url.pathname === '/search/commits') {
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
    return;
  }
  if (url.pathname === '/search/issues') {
    if (url.searchParams.get('sort') !== 'created' || url.searchParams.get('order') !== 'desc' || url.searchParams.get('per_page') !== '6' || request.headers.accept !== 'application/vnd.github+json') {
      reply(422, { message: 'Invalid issue/PR-search request.' });
      return;
    }
    const scenario = url.searchParams.get('q');
    if (scenario === 'author:fixture-limited type:pr') {
      reply(403, { message: 'API rate limit exceeded.' }, { 'Retry-After': '120', 'X-RateLimit-Remaining': '0' });
      return;
    }
    if (scenario === 'author:fixture-html type:pr') {
      response.writeHead(502, { 'Content-Type': 'text/html' });
      response.end('<html>Upstream unavailable</html>');
      return;
    }
    if (scenario === 'author:fixture-timeout type:pr') {
      setTimeout(() => reply(200, { total_count: 0, incomplete_results: false, items: [] }), 500);
      return;
    }
    if (scenario === 'author:fixture-empty type:pr') {
      reply(200, { total_count: 0, incomplete_results: false, items: [] });
      return;
    }
    const pr = (number, date, title, state = 'open', merged_at = null) => ({
      number,
      title,
      state: merged_at ? 'closed' : state,
      draft: state === 'draft',
      html_url: `https://github.com/fixture/example/pull/${number}`,
      repository_url: 'https://api.github.com/repos/fixture/example',
      created_at: date,
      pull_request: {
        url: `https://api.github.com/repos/fixture/example/pulls/${number}`,
        html_url: `https://github.com/fixture/example/pull/${number}`,
        merged_at
      }
    });
    const items = [
      pr(10, '2026-10-19T09:00:00Z', 'Earlier pull request', 'merged', '2026-10-20T08:00:00Z'),
      pr(12, '2026-10-20T09:00:00Z', 'Latest pull request\nDetailed body', 'open'),
      pr(12, '2026-10-20T09:00:00Z', 'Latest pull request\nDetailed body', 'open')
    ];
    if (scenario === 'author:fixture-malformed type:pr') items[0].created_at = 'invalid';
    reply(200, { total_count: 2, incomplete_results: scenario === 'author:fixture-incomplete type:pr', items });
    return;
  }
  reply(501, { message: 'Endpoint not modeled by this contract fixture.' });
});
server.listen(process.env.PORT || 4500);
