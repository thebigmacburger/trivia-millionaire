/* ============================================================
   APP.JS — Entry point, event delegation
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {

  /* ---- Event delegation on #app ---- */
  document.getElementById('app').addEventListener('click', function(e) {
    SoundSystem.activate(); // Initialize audio on first interaction
    handleClick(e);
  });

  /* ---- Event delegation on #overlay-container ---- */
  document.getElementById('overlay-container').addEventListener('click', function(e) {
    SoundSystem.activate();
    handleClick(e);
  });

  /* ---- Body-level delegation for sound toggle button and volume panel ---- */
  document.body.addEventListener('click', function(e) {
    // Handle sound toggle btn and volume panel
    var target = e.target;
    var actionEl = target.closest ? target.closest('[data-action]') : findActionEl(target);
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      if (action === 'toggle-sound-btn' || action === 'mute-toggle') {
        SoundSystem.activate();
        var data = getDataFromEl(actionEl);
        Game.dispatch(action, data);
        e.stopPropagation();
      }
    }

    // Handle volume sliders (not via data-action)
    if (target.tagName === 'INPUT' && target.type === 'range' && target.getAttribute('data-volume')) {
      // Handled inline in UI.js
    }
  }, true); // capture phase

  /* ---- Start the game engine ---- */
  Game.init();
});

/**
 * Find nearest ancestor with data-action (polyfill for browsers without closest)
 */
function findActionEl(el) {
  while (el && el !== document.body) {
    if (el.getAttribute && el.getAttribute('data-action')) return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Extract data-* attributes from element into an object
 */
function getDataFromEl(el) {
  var data = {};
  var attrs = el.attributes;
  for (var i = 0; i < attrs.length; i++) {
    var name = attrs[i].name;
    if (name.startsWith('data-') && name !== 'data-action') {
      // Convert data-category-id → categoryId
      var key = name.replace('data-', '').replace(/-([a-z])/g, function(_, c) {
        return c.toUpperCase();
      });
      data[key] = attrs[i].value;
    }
  }
  return data;
}

/**
 * Handle a click event — find action element and dispatch
 */
function handleClick(e) {
  var target = e.target;
  // Walk up to find data-action
  var actionEl = target.closest ? target.closest('[data-action]') : findActionEl(target);

  if (!actionEl) return;

  // Skip if disabled
  if (actionEl.hasAttribute('disabled') || actionEl.classList.contains('used')) {
    // Special case: lifeline buttons — they should not work when used
    if (actionEl.getAttribute('data-action') === 'use-lifeline') return;
    if (actionEl.hasAttribute('disabled')) return;
  }

  var action = actionEl.getAttribute('data-action');
  var data = getDataFromEl(actionEl);

  Game.dispatch(action, data);
}
