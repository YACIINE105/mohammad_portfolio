import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Run production cursor handlers in an isolated event harness, without a browser.
const source = await readFile(new URL('../assets/playground.js', import.meta.url), 'utf8');
const start = source.indexOf(' let paused=reducedMotion.matches;');
const end = source.indexOf('\n const canvas=', start);
assert.ok(start >= 0 && end > start);
const listeners = new Map();
const mascotListeners = new Map();
const bodyClasses = new Set();
const documentListeners = new Map();
const mediaListeners = new Map();
const variables = new Map();
const frames = new Map();
let nextFrame = 0;
const reducedMotion = { matches: false, addEventListener: (name, callback) => mediaListeners.set(name, callback) };
const mascot = {
  style: { setProperty: (name, value) => variables.set(name, value) },
  getBoundingClientRect: () => ({ left: 400, top: 100, width: 50, height: 50, bottom: 150 }),
  addEventListener: (name, callback) => mascotListeners.set(name, callback),
  setAttribute() {}
};
const context = vm.createContext({
  mascot, reducedMotion,
  document: {
    querySelector: () => ({}),
    body: { classList: { toggle: (name, active) => active ? bodyClasses.add(name) : bodyClasses.delete(name) } },
    addEventListener: (name, callback) => documentListeners.set(name, callback)
  },
  innerWidth: 1200,
  innerHeight: 800,
  addEventListener: (name, callback) => listeners.set(name, callback),
  requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
  cancelAnimationFrame: id => frames.delete(id)
});
vm.runInContext(source.slice(start, end), context);
function settle() {
  let iterations = 0;
  while (frames.size && iterations++ < 100) {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback());
  }
  assert.equal(frames.size, 0, 'Tracking must stop scheduling frames once settled.');
}
function move(x, y, pointerType = 'mouse') {
  documentListeners.get('pointermove')({ clientX: x, clientY: y, pointerType });
  settle();
}
const value = name => Number.parseFloat(variables.get('--buddy-' + name));
settle();
move(50, 300);
assert.ok(value('eyeX') < 0, 'Eyes must look left.');
assert.ok(value('eyeY') > 0, 'Eyes must follow vertical movement.');
move(1100, 20);
assert.ok(value('eyeX') > 0, 'Eyes must look right.');
assert.ok(value('eyeY') < 0);
assert.ok(Math.abs(value('eyeX')) <= 2.5 && Math.abs(value('eyeY')) <= 2, 'Eyes must stay inside the character.');
assert.ok(!variables.has('--buddy-x') && !variables.has('--buddy-y') && !variables.has('--buddy-tilt'), 'Cursor movement must never translate or rotate the blue object.');
assert.ok(!mascotListeners.has('click'), 'The decorative mascot must not toggle any animation state.');
mascotListeners.get('click')?.();
assert.ok(!bodyClasses.has('paused'), 'Clicking the mascot must not pause the note or other animations.');
move(50, 300);
assert.ok(value('eyeX') < 0, 'Eyes must keep following the cursor after a mascot click.');
const beforeTouch = [...variables.entries()];
move(1100, 300, 'touch');
assert.deepEqual([...variables.entries()], beforeTouch, 'Touch scrolling must not drive the character.');
documentListeners.get('pointerleave')();
settle();
assert.equal(value('eyeX'), 0, 'Leaving the page must center the eyes.');
context.innerWidth = 390;
move(1100, 300);
assert.ok(Math.abs(value('eyeX')) <= 2.5, 'Phone eye movement must remain inside the face.');
reducedMotion.matches = true;
mediaListeners.get('change')();
move(50, 20);
assert.equal(value('eyeX'), 0);
assert.equal(frames.size, 0, 'Reduced motion must stop cursor animation.');
assert.ok(bodyClasses.has('paused'));
reducedMotion.matches = false;
mediaListeners.get('change')();
move(1100, 300);
assert.ok(value('eyeX') > 0, 'Turning reduced motion off must restore eye tracking.');
assert.ok(!bodyClasses.has('paused'), 'Turning reduced motion off must restore note animations.');
console.log('Passed production cursor-handler checks: stationary body, eye direction, vertical movement, bounded desktop/mobile range, no click-to-pause action, touch exclusion, centering, reduced-motion changes, and settled-frame cleanup.');
