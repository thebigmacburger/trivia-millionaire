/* ============================================================
   UTILS.JS — Shared utility functions
   ============================================================ */

/**
 * Fisher-Yates shuffle — returns new shuffled array
 */
function shuffle(array) {
  var arr = array.slice();
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Format a number as money: 1000 → "$1,000"
 */
function formatMoney(amount) {
  if (amount >= 1000000) {
    return '$' + (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (amount >= 1000) {
    return '$' + (amount / 1000).toFixed(0) + 'K';
  }
  return '$' + amount.toLocaleString();
}

/**
 * Format money with full number (for summary screens)
 */
function formatMoneyFull(amount) {
  return '$' + amount.toLocaleString();
}

/**
 * Wait ms milliseconds — returns a Promise
 */
function wait(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

/**
 * Random integer inclusive of min and max
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clamp a value between min and max
 */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Pick n random items from array (no repeats)
 */
function pickRandom(array, n) {
  return shuffle(array).slice(0, n);
}

/**
 * Format a date as "Mar 17, 2026"
 */
function formatDate(dateStr) {
  try {
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Deep clone a plain object/array via JSON
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}
