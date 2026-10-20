import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../assets/name-intro.js', import.meta.url), 'utf8');
function createIntro(reduce = false) {
  const frames = new Map();
  const classes = new Set();
  const mediaListeners = new Map();
  let frameId = 0;
  let paused = false;
  let observerCallback;
  let observerDisconnected = false;
  const nameText = {
    textContent: 'Mohammad', dataset: {},
    style: { removeProperty(name) { delete this[name]; } },
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    getBoundingClientRect: () => ({ width: 320 })
  };
  const media = { matches: reduce, addEventListener: (name, callback) => mediaListeners.set(name, callback), removeEventListener: name => mediaListeners.delete(name) };
  vm.runInNewContext(source, {
    document: { getElementById: () => nameText, body: { classList: { contains: () => paused } } },
    matchMedia: () => media,
    MutationObserver: class {
      constructor(callback) { observerCallback = callback; }
      observe() {}
      disconnect() { observerDisconnected = true; }
    },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  return {
    nameText, classes, frames, media,
    tick(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); },
    pause(value) { paused = value; observerCallback(); },
    reduce() { media.matches = true; mediaListeners.get('change')(); },
    disconnected: () => observerDisconnected
  };
}

const intro = createIntro();
assert.equal(intro.nameText.dataset.introState, 'playing');
assert.equal(intro.nameText.style.width, '320px', 'Reserve the name width so the intro cannot move the character or note.');
intro.tick(0);
intro.tick(150);
assert.notEqual(intro.nameText.textContent, 'Mohammad', 'The arrival effect must scramble the name briefly.');
intro.tick(900);
assert.equal(intro.nameText.textContent, 'Mohammad', 'All letters must settle before the effect ends.');
intro.tick(1200);
assert.equal(intro.nameText.dataset.introState, 'complete');
assert.equal(intro.frames.size, 0, 'The name effect must not loop.');
assert.ok(!intro.classes.has('name-intro'));
assert.equal(intro.nameText.style.width, undefined, 'Restore the natural final layout.');
assert.ok(intro.disconnected(), 'Stop observing pause state after the one-time intro.');

const pausedIntro = createIntro();
pausedIntro.tick(0);
pausedIntro.tick(200);
const pausedText = pausedIntro.nameText.textContent;
pausedIntro.pause(true);
pausedIntro.tick(4000);
assert.equal(pausedIntro.nameText.textContent, pausedText);
assert.equal(pausedIntro.frames.size, 0, 'Pause must stop animation frames.');
pausedIntro.pause(false);
pausedIntro.tick(5000);
pausedIntro.tick(6200);
assert.equal(pausedIntro.nameText.dataset.introState, 'complete');

const reducedIntro = createIntro(true);
assert.equal(reducedIntro.nameText.textContent, 'Mohammad');
assert.equal(reducedIntro.frames.size, 0, 'Reduced motion must skip the name effect.');
const changedPreference = createIntro();
changedPreference.tick(0);
changedPreference.tick(150);
changedPreference.reduce();
assert.equal(changedPreference.nameText.textContent, 'Mohammad');
assert.equal(changedPreference.frames.size, 0);
console.log('Passed production name-intro checks: first-load effect, stable width, final name, one-time completion, pause/resume, reduced-motion skip, and live preference change.');
