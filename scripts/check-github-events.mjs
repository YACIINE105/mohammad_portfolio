import assert from 'node:assert/strict';
import { mapGitHubEvent } from '../assets/github-activity.js';

// 1. IssueCommentEvent on PR authored by another user (specifically vivienk/peekaplate #118)
const commentOnOtherPr = {
  id: '19652917513',
  type: 'IssueCommentEvent',
  actor: { login: 'YACIINE105' },
  repo: { name: 'vivienk/peekaplate' },
  created_at: '2026-11-10T09:59:08Z',
  payload: {
    action: 'created',
    issue: {
      number: 118,
      title: 'feat(staging): release menu extraction and connect owner source uploads',
      updated_at: '2026-11-10T10:35:06Z',
      pull_request: {
        html_url: 'https://github.com/vivienk/peekaplate/pull/118'
      }
    },
    comment: {
      id: 6764412190,
      html_url: 'https://github.com/vivienk/peekaplate/pull/118#issuecomment-6764412190',
      body: '## Vision vs OCR+image: representative menu checks\n\nTested the current extraction code with real Gemini 3 Flash Preview',
      created_at: '2026-11-10T09:59:08Z'
    }
  }
};

const mappedComment = mapGitHubEvent(commentOnOtherPr);
assert.ok(mappedComment, 'Comment event must map to an item.');
assert.equal(mappedComment.badge, 'pr comment', 'Must accurately label as PR comment.');
assert.equal(mappedComment.title, 'Vision vs OCR+image: representative menu checks', 'Markdown headers must be stripped for clean title.');
assert.equal(mappedComment.url, 'https://github.com/vivienk/peekaplate/pull/118#issuecomment-6764412190', 'Direct comment anchor link must be preserved.');
assert.equal(mappedComment.date, '2026-11-10T09:59:08Z', 'Date must reflect user comment creation, not subsequent issue update.');
assert.notEqual(mappedComment.date, commentOnOtherPr.payload.issue.updated_at, 'Must never use issue updated_at.');
assert.equal(mappedComment.repository, 'vivienk/peekaplate', 'Repository name must be accurate.');
assert.ok(mappedComment.detail.includes('PR #118'), 'Detail must indicate the target PR.');

// 2. PushEvent mapping
const pushEvent = {
  id: '26268455844',
  type: 'PushEvent',
  actor: { login: 'YACIINE105' },
  repo: { name: 'vivienk/peekaplate' },
  created_at: '2026-11-04T21:20:49Z',
  payload: {
    ref: 'refs/heads/feat/vis-02-res-01-evidence-handoff',
    head: 'f1e91b8335f282f8a6d881c938069285aeb0b1cd'
  }
};
const mappedPush = mapGitHubEvent(pushEvent);
assert.equal(mappedPush.badge, 'push');
assert.ok(mappedPush.title.includes('feat/vis-02-res-01-evidence-handoff'), 'Title must identify pushed branch.');
assert.equal(mappedPush.url, 'https://github.com/vivienk/peekaplate/commit/f1e91b8335f282f8a6d881c938069285aeb0b1cd');
assert.equal(mappedPush.detail, 'commit f1e91b8');

// 3. PullRequestEvent mapping (merged and opened)
const mergedPr = {
  id: '19266495393',
  type: 'PullRequestEvent',
  repo: { name: 'vivienk/peekaplate' },
  created_at: '2026-11-05T20:24:35Z',
  payload: {
    action: 'closed',
    number: 58,
    pull_request: {
      number: 58,
      title: 'PR #58 Update: Clean Merge with upstream/develop',
      merged: true,
      html_url: 'https://github.com/vivienk/peekaplate/pull/58'
    }
  }
};
const mappedMergedPr = mapGitHubEvent(mergedPr);
assert.equal(mappedMergedPr.badge, 'merged');
assert.equal(mappedMergedPr.url, 'https://github.com/vivienk/peekaplate/pull/58');

const openedPr = {
  id: '18387023723',
  type: 'PullRequestEvent',
  repo: { name: 'vivienk/peekaplate' },
  created_at: '2026-10-27T21:02:05Z',
  payload: {
    action: 'opened',
    number: 58,
    pull_request: {
      number: 58,
      title: 'PR #58 Update: Clean Merge',
      merged: false,
      html_url: 'https://github.com/vivienk/peekaplate/pull/58'
    }
  }
};
const mappedOpenedPr = mapGitHubEvent(openedPr);
assert.equal(mappedOpenedPr.badge, 'opened');

// 4. WatchEvent (Star) mapping
const starEvent = {
  id: '18151521002',
  type: 'WatchEvent',
  repo: { name: 'JetBrains/thinkrail' },
  created_at: '2026-10-25T10:23:14Z',
  payload: { action: 'started' }
};
const mappedStar = mapGitHubEvent(starEvent);
assert.equal(mappedStar.badge, 'star');
assert.equal(mappedStar.title, 'Starred JetBrains/thinkrail');
assert.equal(mappedStar.url, 'https://github.com/JetBrains/thinkrail');

// 5. Review & review comments
const reviewCommentEvent = {
  id: '181144001',
  type: 'PullRequestReviewCommentEvent',
  repo: { name: 'vivienk/peekaplate' },
  created_at: '2026-10-24T06:30:30Z',
  payload: {
    action: 'created',
    pull_request: { number: 24 },
    comment: {
      html_url: 'https://github.com/vivienk/peekaplate/pull/24#discussion_r4366257606',
      body: 'Thanks Sai, fixed in 1df6723; branch head is now 0e3f204'
    }
  }
};
const mappedReviewComment = mapGitHubEvent(reviewCommentEvent);
assert.equal(mappedReviewComment.badge, 'review comment');
assert.equal(mappedReviewComment.url, 'https://github.com/vivienk/peekaplate/pull/24#discussion_r4366257606');

// 6. Generic honest fallback on unknown event types
const unknownEvent = {
  id: '777',
  type: 'CustomFutureEvent',
  repo: { name: 'community/awesome-rag' },
  created_at: '2026-10-20T12:00:00Z',
  payload: { data: 'opaque' }
};
const mappedUnknown = mapGitHubEvent(unknownEvent);
assert.equal(mappedUnknown.badge, 'customfuture');
assert.equal(mappedUnknown.badgeClass, 'generic');
assert.equal(mappedUnknown.title, 'Public activity on community/awesome-rag');
assert.equal(mappedUnknown.url, 'https://github.com/community/awesome-rag');

// 7. Security: Unsafe URLs must never pass through
const maliciousEvent = {
  id: '666',
  type: 'IssueCommentEvent',
  repo: { name: 'untrusted/repo' },
  created_at: '2026-10-18T10:00:00Z',
  payload: {
    comment: {
      html_url: 'javascript:alert(document.cookie)',
      body: 'Testing unsafe link injection'
    }
  }
};
const mappedMalicious = mapGitHubEvent(maliciousEvent);
assert.equal(mappedMalicious.url, 'https://github.com/untrusted/repo', 'Unsafe schemes must fall back to repository URL.');

console.log('Passed regression tests: accurate PR #118 comment mapping, pushes, PR states, stars, reviews, generic fallback, and link safety.');
