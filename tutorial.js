import { TUTORIAL } from './data.js';

// ── STATE ─────────────────────────────────────────────────────
let _step = 0;

// ── RENDER ────────────────────────────────────────────────────
function renderStep() {
  const s = TUTORIAL[_step];
  document.getElementById('tstep').textContent  = `Step ${_step + 1} of ${TUTORIAL.length}`;
  document.getElementById('ttitle').textContent = s.title;
  document.getElementById('tbody').innerHTML    = s.body;
  document.getElementById('tdots').innerHTML    = TUTORIAL
    .map((_, i) => `<div class="tdot${i === _step ? ' active' : ''}"></div>`)
    .join('');
  document.getElementById('tnext').textContent  =
    _step < TUTORIAL.length - 1 ? 'Next →' : 'Play →';
}

// ── ADVANCE ───────────────────────────────────────────────────
function advance() {
  if (_step < TUTORIAL.length - 1) {
    _step++;
    renderStep();
  } else {
    document.getElementById('tutorial').style.display = 'none';
  }
}

// ── INIT ──────────────────────────────────────────────────────
// Called once from index.html after the DOM is ready.
export function initTutorial() {
  renderStep();
  document.getElementById('tnext').addEventListener('click', advance);
  document.getElementById('tutorial').style.display = 'flex';
}