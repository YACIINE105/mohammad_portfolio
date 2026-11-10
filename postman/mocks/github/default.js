const http = require('node:http');

// Contract fixture based on GitHub's documented search-commits and public-events response.
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
  const eventsMatch = url.pathname.match(/^\/users\/([^/]+)\/events\/public$/);
  if (eventsMatch) {
    if (request.headers.accept !== 'application/vnd.github+json') {
      reply(422, { message: 'Invalid events request.' });
      return;
    }
    const scenario = eventsMatch[1];
    if (scenario === 'fixture-limited') {
      reply(403, { message: 'API rate limit exceeded.' }, { 'Retry-After': '120', 'X-RateLimit-Remaining': '0' });
      return;
    }
    if (scenario === 'fixture-html') {
      response.writeHead(502, { 'Content-Type': 'text/html' });
      response.end('<html>Upstream unavailable</html>');
      return;
    }
    if (scenario === 'fixture-timeout') {
      setTimeout(() => reply(200, []), 500);
      return;
    }
    if (scenario === 'fixture-empty') {
      reply(200, []);
      return;
    }
    if (scenario === 'fixture-malformed') {
      reply(200, [{ id: '1', type: 'IssueCommentEvent', created_at: 'invalid' }]);
      return;
    }
    const events = [
      {
        id: '19652917513',
        type: 'IssueCommentEvent',
        repo: { name: 'vivienk/peekaplate' },
        created_at: '2026-11-10T09:59:08Z',
        payload: {
          action: 'created',
          issue: {
            number: 118,
            title: 'feat(staging): release menu extraction and connect owner source uploads',
            updated_at: '2026-11-10T10:35:06Z',
            pull_request: { html_url: 'https://github.com/vivienk/peekaplate/pull/118' }
          },
          comment: {
            id: 6764412190,
            html_url: 'https://github.com/vivienk/peekaplate/pull/118#issuecomment-6764412190',
            body: '## Vision vs OCR+image: representative menu checks\n\nTested current extraction code...',
            created_at: '2026-11-10T09:59:08Z'
          }
        }
      },
      {
        id: '26268455844',
        type: 'PushEvent',
        repo: { name: 'vivienk/peekaplate' },
        created_at: '2026-11-04T21:20:49Z',
        payload: {
          ref: 'refs/heads/feat/vis-02-res-01-evidence-handoff',
          head: 'f1e91b8335f282f8a6d881c938069285aeb0b1cd'
        }
      },
      {
        id: '19266495393',
        type: 'PullRequestEvent',
        repo: { name: 'vivienk/peekaplate' },
        created_at: '2026-11-05T20:24:35Z',
        payload: {
          action: 'closed',
          number: 58,
          pull_request: {
            number: 58,
            title: 'PR #58 Update',
            merged: true,
            html_url: 'https://github.com/vivienk/peekaplate/pull/58'
          }
        }
      },
      {
        id: '18151521002',
        type: 'WatchEvent',
        repo: { name: 'JetBrains/thinkrail' },
        created_at: '2026-10-25T10:23:14Z',
        payload: { action: 'started' }
      }
    ];
    reply(200, events);
    return;
  }
  reply(501, { message: 'Endpoint not modeled by this contract fixture.' });
});
server.listen(process.env.PORT || 4500);
