'use strict';

/* ============================================================
   State
   ============================================================ */

const state = {
  tokens: [],          // internal token stream, e.g. ["12","+","sin","(","45",")"]
  mode: 'normal',       // 'normal' | 'scientific'
  angleMode: 'deg',     // 'deg' | 'rad'
  lastWasEquals: false, // true right after a successful '='
};

const FUNCS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt'];
const CONSTS = ['pi', 'e'];
const BINARY_OPS = ['+', '-', '*', '/'];

/* ============================================================
   DOM refs
   ============================================================ */

const el = {
  html: document.documentElement,
  calculator: document.getElementById('calculator'),
  keys: document.getElementById('keys'),
  expression: document.getElementById('expression'),
  result: document.getElementById('result'),
  display: document.querySelector('.display'),
  themeToggle: document.getElementById('themeToggle'),
  modeNormalBtn: document.getElementById('modeNormalBtn'),
  modeSciBtn: document.getElementById('modeSciBtn'),
  angleToggle: document.getElementById('angleToggle'),
  sciHint: document.getElementById('sciHint'),
};

/* ============================================================
   Key layouts
   ============================================================ */

function key(action, value, label, extraClass, aria) {
  return { action, value, label, extraClass: extraClass || '', aria: aria || label };
}

const NORMAL_KEYS = [
  key('clear', null, 'AC', 'key--util', 'All clear'),
  key('delete', null, 'DEL', 'key--util', 'Delete last entry'),
  key('percent', '%', '%', 'key--op', 'Percent'),
  key('operator', '/', '÷', 'key--op', 'Divide'),

  key('digit', '7', '7'),
  key('digit', '8', '8'),
  key('digit', '9', '9'),
  key('operator', '*', '×', 'key--op', 'Multiply'),

  key('digit', '4', '4'),
  key('digit', '5', '5'),
  key('digit', '6', '6'),
  key('operator', '-', '−', 'key--op', 'Subtract'),

  key('digit', '1', '1'),
  key('digit', '2', '2'),
  key('digit', '3', '3'),
  key('operator', '+', '+', 'key--op', 'Add'),

  key('digit', '0', '0', 'key--zero'),
  key('decimal', '.', '.', '', 'Decimal point'),
  key('equals', null, '=', 'key--equals', 'Equals'),
];

const SCI_KEYS = [
  key('func', 'sin', 'sin', 'key--func'),
  key('func', 'cos', 'cos', 'key--func'),
  key('func', 'tan', 'tan', 'key--func'),
  key('func', 'asin', 'asin', 'key--func', 'Inverse sine'),
  key('func', 'acos', 'acos', 'key--func', 'Inverse cosine'),

  key('func', 'atan', 'atan', 'key--func', 'Inverse tangent'),
  key('func', 'log', 'log', 'key--func', 'Log base 10'),
  key('func', 'ln', 'ln', 'key--func', 'Natural log'),
  key('func', 'sqrt', '√', 'key--func', 'Square root'),
  key('square', null, 'x²', 'key--func', 'Square'),

  key('power', '^', 'xʸ', 'key--func', 'Power'),
  key('const', 'pi', 'π', '', 'Pi'),
  key('const', 'e', 'e', '', "Euler's number"),
  key('factorial', null, 'n!', 'key--func', 'Factorial'),
  key('paren', '(', '(', '', 'Open parenthesis'),

  key('paren', ')', ')', '', 'Close parenthesis'),
  key('clear', null, 'AC', 'key--util', 'All clear'),
  key('delete', null, 'DEL', 'key--util', 'Delete last entry'),
  key('percent', '%', '%', 'key--op', 'Percent'),
  key('operator', '/', '÷', 'key--op', 'Divide'),

  key('digit', '7', '7'),
  key('digit', '8', '8'),
  key('digit', '9', '9'),
  key('operator', '*', '×', 'key--op', 'Multiply'),
  key('operator', '-', '−', 'key--op', 'Subtract'),

  key('digit', '4', '4'),
  key('digit', '5', '5'),
  key('digit', '6', '6'),
  key('operator', '+', '+', 'key--op', 'Add'),
  key('decimal', '.', '.', '', 'Decimal point'),

  key('digit', '1', '1'),
  key('digit', '2', '2'),
  key('digit', '3', '3'),
  key('digit', '0', '0'),
  key('equals', null, '=', 'key--equals', 'Equals'),
];

/* ============================================================
   Rendering keys
   ============================================================ */

function renderKeys() {
  const layout = state.mode === 'scientific' ? SCI_KEYS : NORMAL_KEYS;
  el.keys.innerHTML = '';
  el.keys.classList.remove('is-switching');
  // force reflow to restart animation
  void el.keys.offsetWidth;
  el.keys.classList.add('is-switching');

  layout.forEach((cfg) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `key ${cfg.extraClass}`.trim();
    btn.textContent = cfg.label;
    btn.setAttribute('aria-label', cfg.aria);
    btn.dataset.action = cfg.action;
    if (cfg.value !== null && cfg.value !== undefined) btn.dataset.value = cfg.value;
    el.keys.appendChild(btn);
  });
}

/* ============================================================
   Token helpers
   ============================================================ */

function lastToken() {
  return state.tokens.length ? state.tokens[state.tokens.length - 1] : null;
}

function isNumberToken(t) {
  return t !== null && t !== undefined && /^[0-9]*\.?[0-9]*$/.test(t) && t !== '' && t !== '.';
}

function isValueEnd(t) {
  // token types after which a new value (digit/const/paren-open/func) would need an implicit '*'
  if (t === null) return false;
  if (isNumberToken(t)) return true;
  if (t === ')') return true;
  if (t === '%' || t === '!') return true;
  if (CONSTS.includes(t)) return true;
  return false;
}

function pushToken(t) {
  state.tokens.push(t);
}

function maybeInsertImplicitMultiply() {
  if (isValueEnd(lastToken())) {
    pushToken('*');
  }
}

/* ============================================================
   Input actions
   ============================================================ */

function resetIfAfterEquals(kind) {
  // After a result, most inputs should start a fresh expression,
  // except digits/decimal continuing to build on the result is also common,
  // but we choose the clearer UX: any new digit/func/const/paren starts fresh,
  // while operators continue from the shown result.
  if (!state.lastWasEquals) return;
  state.lastWasEquals = false;
  if (kind === 'operator') return; // keep result, continue calculating
  state.tokens = [];
}

function actionDigit(d) {
  resetIfAfterEquals('digit');
  const last = lastToken();
  if (last !== null && isNumberToken(last) && last !== '') {
    state.tokens[state.tokens.length - 1] = last + d;
  } else {
    if (isValueEnd(last)) pushToken('*');
    pushToken(d);
  }
  render();
}

function actionDecimal() {
  resetIfAfterEquals('decimal');
  const last = lastToken();
  if (last !== null && isNumberToken(last)) {
    if (!last.includes('.')) {
      state.tokens[state.tokens.length - 1] = last + '.';
    }
  } else {
    if (isValueEnd(last)) pushToken('*');
    pushToken('0.');
  }
  render();
}

function actionOperator(op) {
  resetIfAfterEquals('operator');
  const last = lastToken();
  if (last === null) {
    if (op === '-') pushToken('-'); // leading negative
    render();
    return;
  }
  if (BINARY_OPS.includes(last)) {
    state.tokens[state.tokens.length - 1] = op; // replace trailing operator
  } else if (last === '(' ) {
    if (op === '-') pushToken('-'); // unary minus after '('
  } else {
    pushToken(op);
  }
  render();
}

function actionPower() {
  resetIfAfterEquals('operator');
  const last = lastToken();
  if (isValueEnd(last)) pushToken('^');
  render();
}

function actionSquare() {
  resetIfAfterEquals('digit');
  const last = lastToken();
  if (isValueEnd(last)) {
    pushToken('^');
    pushToken('2');
  }
  render();
}

function actionPercent() {
  const last = lastToken();
  if (isValueEnd(last) && last !== '%' && last !== '!') pushToken('%');
  render();
}

function actionFactorial() {
  const last = lastToken();
  if (isValueEnd(last) && last !== '%' && last !== '!') pushToken('!');
  render();
}

function actionFunc(name) {
  resetIfAfterEquals('func');
  maybeInsertImplicitMultiply();
  pushToken(name);
  pushToken('(');
  render();
}

function actionConst(name) {
  resetIfAfterEquals('const');
  maybeInsertImplicitMultiply();
  pushToken(name);
  render();
}

function actionParenOpen() {
  resetIfAfterEquals('paren');
  maybeInsertImplicitMultiply();
  pushToken('(');
  render();
}

function actionParenClose() {
  const opens = state.tokens.filter((t) => t === '(').length;
  const closes = state.tokens.filter((t) => t === ')').length;
  if (opens > closes && isValueEnd(lastToken())) {
    pushToken(')');
  }
  render();
}

function actionClear() {
  state.tokens = [];
  state.lastWasEquals = false;
  el.result.dataset.error = 'false';
  render();
}

function actionDelete() {
  state.lastWasEquals = false;
  state.tokens.pop();
  el.result.dataset.error = 'false';
  render();
}

function actionEquals() {
  if (!state.tokens.length) return;
  try {
    const tokensToEval = closeParens(state.tokens);
    const value = evaluateTokens(tokensToEval);
    if (!isFinite(value)) throw new Error('Math error');
    const formatted = formatNumber(value);
    el.expression.textContent = renderTokens(state.tokens) + ' =';
    el.result.textContent = formatted;
    el.result.dataset.error = 'false';
    state.tokens = [formatted];
    state.lastWasEquals = true;
    flashConfirm();
  } catch (err) {
    el.result.textContent = 'Error';
    el.result.dataset.error = 'true';
    state.lastWasEquals = false;
  }
}

function flashConfirm() {
  el.display.classList.add('is-confirmed');
  window.setTimeout(() => el.display.classList.remove('is-confirmed'), 260);
}

function closeParens(tokens) {
  const opens = tokens.filter((t) => t === '(').length;
  const closes = tokens.filter((t) => t === ')').length;
  const diff = opens - closes;
  if (diff <= 0) return tokens;
  return tokens.concat(Array(diff).fill(')'));
}

/* ============================================================
   Rendering the display
   ============================================================ */

const DISPLAY_MAP = {
  '*': '×',
  '/': '÷',
  '-': '−',
  pi: 'π',
  sqrt: '√',
};

function renderTokens(tokens) {
  let out = '';
  tokens.forEach((t, i) => {
    const prev = i > 0 ? tokens[i - 1] : null;
    const isUnaryMinus = t === '-' && (prev === null || prev === '(' || BINARY_OPS.includes(prev) || prev === '^');
    const isBinaryOp = BINARY_OPS.includes(t) && !isUnaryMinus;
    const display = DISPLAY_MAP[t] !== undefined ? DISPLAY_MAP[t] : t;
    if (isBinaryOp) {
      out += ` ${display} `;
    } else {
      out += display;
    }
  });
  return out.replace(/\s+/g, ' ').trim();
}

function render() {
  if (!state.tokens.length) {
    el.expression.innerHTML = '&nbsp;';
    el.result.textContent = '0';
    el.result.dataset.error = 'false';
    return;
  }
  if (state.lastWasEquals) {
    // expression line already shows "... =" from actionEquals; keep result as-is
    return;
  }
  el.expression.textContent = renderTokens(state.tokens) || '\u00A0';
  el.result.textContent = renderTokens(state.tokens) || '0';
  el.result.dataset.error = 'false';
}

function formatNumber(n) {
  if (Object.is(n, -0)) n = 0;
  if (Math.abs(n) > 0 && (Math.abs(n) < 1e-9 || Math.abs(n) >= 1e15)) {
    return n.toExponential(6).replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e');
  }
  const rounded = Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  let str = String(rounded);
  if (str.length > 16) {
    str = rounded.toPrecision(12).replace(/\.?0+$/, '');
  }
  return str;
}

/* ============================================================
   Safe expression evaluator (recursive descent, no eval)
   ============================================================ */

function evaluateTokens(tokens) {
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume() { return tokens[pos++]; }

  function parseExpression() {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parseUnary();
      if (op === '*') {
        left = left * right;
      } else {
        if (right === 0) throw new Error('Division by zero');
        left = left / right;
      }
    }
    return left;
  }

  function parseUnary() {
    if (peek() === '-') { consume(); return -parseUnary(); }
    if (peek() === '+') { consume(); return parseUnary(); }
    return parsePower();
  }

  function parsePower() {
    const base = parsePostfix();
    if (peek() === '^') {
      consume();
      const exp = parseUnary();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parsePostfix() {
    let value = parsePrimary();
    for (;;) {
      if (peek() === '%') { consume(); value = value / 100; }
      else if (peek() === '!') { consume(); value = factorial(value); }
      else break;
    }
    return value;
  }

  function parsePrimary() {
    const t = peek();
    if (t === undefined) throw new Error('Unexpected end of expression');

    if (isNumberToken(t)) { consume(); return parseFloat(t); }

    if (t === 'pi') { consume(); return Math.PI; }
    if (t === 'e') { consume(); return Math.E; }

    if (t === '(') {
      consume();
      const v = parseExpression();
      if (peek() !== ')') throw new Error('Missing closing parenthesis');
      consume();
      return v;
    }

    if (FUNCS.includes(t)) {
      consume();
      if (peek() !== '(') throw new Error('Expected ( after function');
      consume();
      const arg = parseExpression();
      if (peek() !== ')') throw new Error('Missing closing parenthesis');
      consume();
      return applyFunc(t, arg);
    }

    throw new Error('Unexpected token: ' + t);
  }

  const result = parseExpression();
  if (pos !== tokens.length) throw new Error('Unexpected trailing tokens');
  return result;
}

function toRad(deg) { return (deg * Math.PI) / 180; }
function toDeg(rad) { return (rad * 180) / Math.PI; }

function applyFunc(name, x) {
  const deg = state.angleMode === 'deg';
  switch (name) {
    case 'sin': return Math.sin(deg ? toRad(x) : x);
    case 'cos': return Math.cos(deg ? toRad(x) : x);
    case 'tan': return Math.tan(deg ? toRad(x) : x);
    case 'asin': {
      const r = Math.asin(x);
      return deg ? toDeg(r) : r;
    }
    case 'acos': {
      const r = Math.acos(x);
      return deg ? toDeg(r) : r;
    }
    case 'atan': {
      const r = Math.atan(x);
      return deg ? toDeg(r) : r;
    }
    case 'log':
      if (x <= 0) throw new Error('log of non-positive number');
      return Math.log10 ? Math.log10(x) : Math.log(x) / Math.LN10;
    case 'ln':
      if (x <= 0) throw new Error('ln of non-positive number');
      return Math.log(x);
    case 'sqrt':
      if (x < 0) throw new Error('sqrt of negative number');
      return Math.sqrt(x);
    default:
      throw new Error('Unknown function: ' + name);
  }
}

function factorial(n) {
  if (n < 0 || !Number.isFinite(n) || Math.abs(n - Math.round(n)) > 1e-9) {
    throw new Error('Factorial requires a non-negative integer');
  }
  n = Math.round(n);
  if (n > 170) return Infinity;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/* ============================================================
   Event delegation for keys
   ============================================================ */

el.keys.addEventListener('click', (e) => {
  const btn = e.target.closest('.key');
  if (!btn) return;
  handleAction(btn.dataset.action, btn.dataset.value);
  btn.classList.add('is-pressed');
  window.setTimeout(() => btn.classList.remove('is-pressed'), 120);
});

function handleAction(action, value) {
  switch (action) {
    case 'digit': actionDigit(value); break;
    case 'decimal': actionDecimal(); break;
    case 'operator': actionOperator(value); break;
    case 'power': actionPower(); break;
    case 'square': actionSquare(); break;
    case 'percent': actionPercent(); break;
    case 'factorial': actionFactorial(); break;
    case 'func': actionFunc(value); break;
    case 'const': actionConst(value); break;
    case 'paren': value === '(' ? actionParenOpen() : actionParenClose(); break;
    case 'clear': actionClear(); break;
    case 'delete': actionDelete(); break;
    case 'equals': actionEquals(); break;
    default: break;
  }
}

/* ============================================================
   Keyboard support
   ============================================================ */

window.addEventListener('keydown', (e) => {
  const k = e.key;

  if (/^[0-9]$/.test(k)) { actionDigit(k); return; }
  if (k === '.') { actionDecimal(); return; }
  if (k === '+') { actionOperator('+'); return; }
  if (k === '-') { actionOperator('-'); return; }
  if (k === '*') { actionOperator('*'); return; }
  if (k === '/') { e.preventDefault(); actionOperator('/'); return; }
  if (k === '^') { actionPower(); return; }
  if (k === '%') { actionPercent(); return; }
  if (k === '(') { actionParenOpen(); return; }
  if (k === ')') { actionParenClose(); return; }
  if (k === 'Enter' || k === '=') { e.preventDefault(); actionEquals(); return; }
  if (k === 'Backspace') { actionDelete(); return; }
  if (k === 'Escape') { actionClear(); return; }
  if (k === '!') { actionFactorial(); return; }
});

/* ============================================================
   Mode switching
   ============================================================ */

const modeSwitchEl = document.querySelector('.mode-switch');

function setMode(mode) {
  state.mode = mode;
  state.tokens = [];
  state.lastWasEquals = false;
  el.calculator.dataset.mode = mode;
  modeSwitchEl.classList.toggle('is-sci', mode === 'scientific');
  el.modeNormalBtn.classList.toggle('is-active', mode === 'normal');
  el.modeSciBtn.classList.toggle('is-active', mode === 'scientific');
  el.modeNormalBtn.setAttribute('aria-selected', String(mode === 'normal'));
  el.modeSciBtn.setAttribute('aria-selected', String(mode === 'scientific'));
  renderKeys();
  render();
}

el.modeNormalBtn.addEventListener('click', () => setMode('normal'));
el.modeSciBtn.addEventListener('click', () => setMode('scientific'));

el.angleToggle.addEventListener('click', () => {
  state.angleMode = state.angleMode === 'deg' ? 'rad' : 'deg';
  el.angleToggle.textContent = state.angleMode.toUpperCase();
});

/* ============================================================
   Theme (light / dark) with persistence
   ============================================================ */

function applyTheme(theme) {
  el.html.setAttribute('data-theme', theme);
  el.themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  el.themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  try { localStorage.setItem('calculator-theme', theme); } catch (err) { /* storage unavailable */ }
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('calculator-theme'); } catch (err) { /* ignore */ }
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved);
    return;
  }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

el.themeToggle.addEventListener('click', () => {
  const current = el.html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   Init
   ============================================================ */

initTheme();
renderKeys();
render();
