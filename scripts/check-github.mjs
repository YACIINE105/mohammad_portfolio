import assert from 'node:assert/strict';
import { fetchRecentCommits, GitHubError } from '../assets/github-activity.js';

const apiBase = process.env.GITHUB_TEST_BASE_URL || 'http://127.0.0.1:4900/github';
const fetchScenario = (scenario, signal) => fetchRecentCommits({ apiBase, username: 'fixture-' + scenario, signal });
const result = await fetchScenario('success');
assert.equal(result.commits.length, 2, 'Duplicate commits must be removed.');
assert.equal(result.commits[0].message, 'Latest change', 'Newest commit must appear first, using only the subject.');
assert.ok(Date.parse(result.commits[0].date) > Date.parse(result.commits[1].date));
assert.deepEqual((await fetchScenario('empty')).commits, [], 'Empty history is a valid response.');
await assert.rejects(fetchScenario('malformed'), /invalid activity/);
await assert.rejects(fetchScenario('incomplete'), /incomplete activity/);
await assert.rejects(fetchScenario('limited'), error => error instanceof GitHubError && error.retryAt > Date.now() + 110000);
await assert.rejects(fetchScenario('html'), error => error instanceof GitHubError && /temporarily unavailable/.test(error.message));
await assert.rejects(fetchScenario('timeout', AbortSignal.timeout(100)), error => ['AbortError', 'TimeoutError'].includes(error.name));
console.log('Passed against Postman simulation: real HTTP requests, newest-first ordering, deduplication, empty history, malformed/incomplete data, rate-limit backoff, HTML upstream failure, and request timeout.');
