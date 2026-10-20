import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the production pointer handlers without opening or sending email.
// Browser gesture and layout checks remain separate from this event harness.
const source = await readFile(new URL('../assets/playground.js', import.meta.url), 'utf8');
const handlers = source.slice(source.indexOf(' const noteButton='), source.indexOf(" document.getElementById('note-form').addEventListener"));
assert.ok(handlers.includes('finishNotePull'), 'The production pull handlers must be present.');

class Element {
  constructor() {
    this.listeners = new Map();
    this.classes = new Set();
    this.properties = new Map();
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name)
    };
    this.style = { setProperty: (name, value) => this.properties.set(name, value) };
    this.textContent = 'Fold me a note';
  }
  addEventListener(name, handler) {
    const listeners = this.listeners.get(name) || [];
    listeners.push(handler);
    this.listeners.set(name, listeners);
  }
  emit(name, values = {}) {
    const event = { isPrimary: true, button: 0, pointerId: 1, clientX: 100, clientY: 100, detail: 1, preventDefault() {}, ...values };
    for (const handler of this.listeners.get(name) || []) handler(event);
  }
  setPointerCapture(pointerId) { this.pointerId = pointerId; }
  hasPointerCapture(pointerId) { return this.pointerId === pointerId; }
  releasePointerCapture() { this.pointerId = null; this.emit('lostpointercapture'); }
  click() { this.emit('click'); }
  focus() { this.focused = true; }
}

const elements = Object.fromEntries(['fold-note', 'contact-dialog', 'open-contact', 'note-message'].map(id => [id, new Element()]));
const hangingNote = new Element();
const windowEvents = new Element();
let openCount = 0;
elements['open-contact'].addEventListener('click', () => { elements['contact-dialog'].open = true; openCount++; });
vm.runInNewContext(handlers, {
  document: { getElementById: id => elements[id], querySelector: () => hangingNote },
  addEventListener: (name, handler) => windowEvents.addEventListener(name, handler),
  setTimeout, clearTimeout
});
const button = elements['fold-note'];
const close = () => { elements['contact-dialog'].open = false; elements['contact-dialog'].emit('close'); };
const pull = (distance, terminal = 'pointerup') => {
  button.emit('pointerdown');
  button.emit('pointermove', { clientY: 100 + distance });
  button.emit(terminal, { clientY: 100 + distance });
  button.emit('click');
};

pull(30);
assert.equal(openCount, 0, 'A short pull must return without opening mail via the compatibility click.');
button.emit('pointerdown');
button.emit('pointermove', { clientY: 180 });
assert.equal(hangingNote.properties.get('--note-pull-distance'), '80px', 'The rope must follow a downward pull.');
assert.ok(hangingNote.classes.has('is-armed'));
assert.equal(button.textContent, 'Release to write');
button.emit('pointerup', { clientY: 180 });
button.emit('click');
assert.equal(openCount, 1, 'A completed pull must open the composer exactly once.');
assert.equal(hangingNote.properties.get('--note-pull-distance'), '0px');
assert.equal(button.textContent, 'Fold me a note');
close();
assert.ok(button.focused, 'Closing the composer must return focus to the note.');

pull(90, 'pointercancel');
assert.equal(openCount, 1, 'A cancelled touch must not open the composer.');
pull(-40);
assert.equal(openCount, 1, 'An upward drag must not open the composer.');
button.emit('pointerdown');
button.emit('pointermove', { clientY: 180 });
windowEvents.emit('blur');
assert.ok(!hangingNote.classes.has('is-pulling'));
assert.equal(openCount, 1, 'Losing window focus must cancel the pull.');
button.emit('click', { detail: 0 });
assert.equal(openCount, 2, 'Keyboard activation must remain available.');
close();
await new Promise(resolve => setTimeout(resolve, 1));
button.click();
assert.equal(openCount, 3, 'A later ordinary click must not be swallowed by an earlier drag.');
console.log('Passed production pull-handler checks: threshold, rope tracking, armed feedback, single opening, short/upward/cancelled drags, focus loss, keyboard activation, and click recovery.');
