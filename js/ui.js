/* ============================================================
   UI.JS — All rendering functions (vanilla JS, no framework)
   ============================================================ */

var UI = (function() {
  var app = null;
  var overlayContainer = null;
  var _timerAnnounced = {};

  function init() {
    app = document.getElementById('app');
    overlayContainer = document.getElementById('overlay-container');
  }

  function setApp(html) {
    app.innerHTML = html;
    // Move focus to first heading so screen readers announce the new screen
    setTimeout(function() {
      var heading = app.querySelector('h1, h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: false });
      }
    }, 50);
  }

  function setOverlay(html) {
    overlayContainer.innerHTML = html;
    // Move focus to first interactive element inside the overlay
    setTimeout(function() {
      var first = overlayContainer.querySelector('button:not([disabled]), [tabindex="0"]');
      if (first) first.focus();
    }, 80);
  }

  function clearOverlay() {
    overlayContainer.innerHTML = '';
    // Restore focus to next-question button or first available lifeline
    var focusTarget = document.querySelector('#next-btn-wrap button') ||
                      document.querySelector('.lifelines-bar button:not([disabled])');
    if (focusTarget) focusTarget.focus();
  }

  /* ============================================================
     TITLE SCREEN
     ============================================================ */
  function renderTitleScreen(highScores) {
    var scoresHtml = '';
    if (highScores && highScores.length > 0) {
      scoresHtml = highScores.map(function(s, i) {
        return '<li>' +
          '<span class="score-rank">' + (i + 1) + '.</span>' +
          '<span class="score-name">Player</span>' +
          '<span class="score-amount">' + formatMoneyFull(s.score) + '</span>' +
          '<span class="score-date">' + formatDate(s.date) + '</span>' +
          '</li>';
      }).join('');
    } else {
      scoresHtml = '<p class="no-scores">No high scores yet. Be the first!</p>';
    }

    var html = '<div class="screen title-screen stars-bg">' +
      '<div class="spotlight-overlay"></div>' +
      '<div class="title-logo anim-fadeInUp">' +
        '<div class="subtitle">Welcome to</div>' +
        '<h1 class="title-shimmer">TRIVIA MILLIONAIRE</h1>' +
        '<p class="tagline">6 Rounds · 60 Questions · £192,000 to win</p>' +
        '<p class="disclaimer">For entertainment purposes only. No money is payable.</p>' +
      '</div>' +
      '<div class="title-content">' +
        '<div class="high-scores-box anim-fadeInUp stagger-1">' +
          '<h3><span aria-hidden="true">🏆</span> High Scores</h3>' +
          '<ul class="score-list">' + scoresHtml + '</ul>' +
        '</div>' +
        '<div class="title-actions anim-fadeInUp stagger-2">' +
          '<button class="btn btn-primary" data-action="start-game"><span aria-hidden="true">▶</span> Start Game</button>' +
          '<button class="btn btn-secondary" data-action="toggle-sound"><span aria-hidden="true">🔊</span> Sound Settings</button>' +
        '</div>' +
      '</div>' +
      '</div>';

    setApp(html);
    renderSoundToggleBtn();
  }

  /* ============================================================
     ROUND INTRO
     ============================================================ */
  function renderRoundIntro(roundNumber) {
    var taglines = [
      'Let\'s get started!',
      'Stepping it up!',
      'Halfway there!',
      'The pressure builds!',
      'Almost at the top!',
      'Final round — give it all you\'ve got!'
    ];
    var tagline = taglines[Math.min(roundNumber - 1, taglines.length - 1)];

    var html = '<div class="screen round-intro-screen">' +
      '<div class="spotlight-overlay"></div>' +
      '<div class="round-intro-content">' +
        '<div class="round-intro-label anim-slideDown">Round</div>' +
        '<div class="round-intro-number round-number-reveal">' + roundNumber + '</div>' +
        '<div class="round-intro-tagline anim-fadeInUp">' + escapeHtml(tagline) + '</div>' +
        '<div class="anim-fadeInUp stagger-2" style="color: var(--text-muted); font-size: 0.9rem;">' +
          'Choose your category to begin' +
        '</div>' +
      '</div>' +
      '</div>';

    setApp(html);
  }

  /* ============================================================
     CATEGORY SELECT
     ============================================================ */
  function renderCategorySelect(categories) {
    var cardsHtml = categories.map(function(cat, i) {
      return '<button class="category-card anim-fadeInUp stagger-' + (i + 1) + '" ' +
             'data-action="select-category" data-category-id="' + escapeHtml(cat.id) + '">' +
        '<span class="category-icon" aria-hidden="true">' + cat.icon + '</span>' +
        '<span class="category-name">' + escapeHtml(cat.name) + '</span>' +
        '</button>';
    }).join('');

    var html = '<div class="screen category-screen">' +
      '<div class="spotlight-overlay"></div>' +
      '<h2 class="anim-slideDown">Choose Your Category</h2>' +
      '<p class="instruction anim-fadeIn">Pick a category for this round</p>' +
      '<div class="category-grid">' + cardsHtml + '</div>' +
      '</div>';

    setApp(html);
  }

  /* ============================================================
     QUESTION SCREEN
     ============================================================ */
  function renderQuestionScreen(question, questionNumber, totalQuestions, lifelines, roundNumber) {
    var letters = ['A', 'B', 'C', 'D'];
    var optionsHtml = question.options.map(function(opt, i) {
      return '<button class="option-btn" data-action="select-answer" data-index="' + i + '"' +
             ' aria-label="' + letters[i] + ': ' + escapeHtml(opt) + '">' +
        '<span class="option-letter" aria-hidden="true">' + letters[i] + '</span>' +
        '<span class="option-text">' + escapeHtml(opt) + '</span>' +
        '</button>';
    }).join('');

    var lifelinesState = lifelines.getState();
    var lifelineButtons = [
      { key: 'fiftyFifty',  icon: '✂️', label: '50:50' },
      { key: 'askAudience', icon: '👥', label: 'Ask Audience' },
      { key: 'phoneAFriend',icon: '📞', label: 'Phone Friend' }
    ].map(function(l) {
      var usedClass = lifelinesState[l.key] ? ' used' : '';
      var isUsed = lifelinesState[l.key];
      return '<button class="lifeline-btn' + usedClass + '" ' +
             'data-action="use-lifeline" data-lifeline="' + l.key + '"' +
             (isUsed ? ' disabled aria-disabled="true"' : '') +
             ' aria-label="' + l.label + (isUsed ? ', already used' : '') + '">' +
        '<span class="lifeline-icon" aria-hidden="true">' + l.icon + '</span>' +
        '<span aria-hidden="true">' + l.label + '</span>' +
        '</button>';
    }).join('');

    // Money ladder
    var ladderHtml = MONEY_LADDER.map(function(amount, i) {
      var classes = 'ladder-item';
      if (i === questionNumber - 1) classes += ' current';
      else if (i < questionNumber - 1) classes += ' passed';
      if (i === SAFE_HAVEN_INDEX) classes += ' safe-haven';

      var ariaCurrent = (i === questionNumber - 1) ? ' aria-current="true"' : '';
      return '<li class="' + classes + '" id="ladder-item-' + i + '"' + ariaCurrent + '>' +
        '<span class="ladder-num" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="ladder-amount">' + formatMoney(amount) + '</span>' +
        '</li>';
    }).reverse().join(''); // Reverse so highest is at top

    var timerHtml = '<div class="timer-ring" id="timer-ring" role="timer" aria-label="Time remaining">' +
      '<svg class="timer-svg" viewBox="0 0 110 110" aria-hidden="true">' +
        '<circle class="timer-track" cx="55" cy="55" r="45"/>' +
        '<circle class="timer-progress" cx="55" cy="55" r="45" id="timer-progress"/>' +
      '</svg>' +
      '<div class="timer-text" id="timer-text" aria-hidden="true">--</div>' +
      '</div>';

    var html = '<div class="question-layout">' +
      '<div class="question-main">' +
        // Top bar
        '<div class="question-topbar">' +
          '<span class="round-badge">Round ' + roundNumber + '</span>' +
          '<span class="question-progress">Question ' + questionNumber + ' of ' + totalQuestions + '</span>' +
          timerHtml +
        '</div>' +
        // Question
        '<div class="question-spotlight anim-fadeIn">' +
          '<div class="spotlight-overlay"></div>' +
          '<p class="question-text">' + escapeHtml(question.question) + '</p>' +
        '</div>' +
        // Options
        '<div class="options-grid anim-fadeInUp" id="options-grid">' +
          optionsHtml +
        '</div>' +
        // Explanation
        '<div class="explanation-box" id="explanation-box" aria-live="polite">' +
          '<p><strong><span aria-hidden="true">💡</span> Did you know?</strong> ' + escapeHtml(question.explanation || '') + '</p>' +
        '</div>' +
        // Lifelines
        '<div class="lifelines-bar">' +
          lifelineButtons +
        '</div>' +
        // Next button (hidden initially)
        '<div class="next-btn-wrap" id="next-btn-wrap" style="display:none">' +
          '<button class="btn btn-primary" data-action="next-question">Next Question →</button>' +
        '</div>' +
      '</div>' +
      // Sidebar
      '<div class="money-sidebar">' +
        '<div class="money-sidebar-title" aria-hidden="true">Money Ladder</div>' +
        '<ul class="money-ladder" aria-label="Money ladder">' + ladderHtml + '</ul>' +
      '</div>' +
      '</div>';

    _timerAnnounced = {};
    setApp(html);
  }

  /* ============================================================
     ANSWER REVEAL — highlight options after answer
     ============================================================ */
  function renderAnswerReveal(question, selectedIndex, correct) {
    var optionBtns = document.querySelectorAll('.option-btn');
    optionBtns.forEach(function(btn) {
      btn.classList.add('disabled');
      btn.setAttribute('disabled', 'disabled');
    });

    if (selectedIndex !== null && selectedIndex !== undefined) {
      var selectedBtn = optionBtns[selectedIndex];
      if (selectedBtn) {
        if (selectedIndex === question.answer) {
          selectedBtn.classList.add('correct');
        } else {
          selectedBtn.classList.add('wrong');
          selectedBtn.classList.add('anim-shake');
          // Also highlight correct answer
          optionBtns[question.answer].classList.add('correct');
        }
      }
    } else {
      // Timeout — just show correct
      optionBtns[question.answer].classList.add('correct');
    }

    // Announce result to screen readers
    var resultText;
    if (selectedIndex !== null && selectedIndex !== undefined) {
      if (selectedIndex === question.answer) {
        resultText = 'Correct!';
      } else {
        resultText = 'Wrong. The correct answer was: ' + question.options[question.answer];
      }
    } else {
      resultText = 'Time\'s up. The correct answer was: ' + question.options[question.answer];
    }
    announce(resultText);

    // Show next button
    var nextWrap = document.getElementById('next-btn-wrap');
    if (nextWrap) nextWrap.style.display = 'flex';

    // Show explanation after delay
    setTimeout(function() {
      var expBox = document.getElementById('explanation-box');
      if (expBox) {
        expBox.classList.add('visible', 'explanation-reveal');
      }
    }, 800);
  }

  /* ============================================================
     UPDATE TIMER RING
     ============================================================ */
  function updateTimerRing(fraction, remaining) {
    var progress = document.getElementById('timer-progress');
    var timerText = document.getElementById('timer-text');
    var timerRing = document.getElementById('timer-ring');

    if (!progress || !timerText) return;

    var circumference = 282.74;
    var offset = circumference * (1 - fraction);
    progress.style.strokeDashoffset = offset;

    var secs = Math.ceil(remaining);
    timerText.textContent = secs;

    // Announce at 10s and 5s for screen readers
    if ((secs === 10 || secs === 5) && !_timerAnnounced[secs] && secs > 0) {
      _timerAnnounced[secs] = true;
      announce(secs + ' seconds remaining');
    }

    // Color states
    if (timerRing) {
      timerRing.classList.remove('timer-urgent', 'timer-warning');
      if (remaining <= 5) {
        timerRing.classList.add('timer-urgent');
      } else if (remaining <= 10) {
        timerRing.classList.add('timer-warning');
      }
    }
  }

  /* ============================================================
     UPDATE MONEY LADDER
     ============================================================ */
  function updateMoneyLadder(currentIndex) {
    MONEY_LADDER.forEach(function(_, i) {
      var item = document.getElementById('ladder-item-' + i);
      if (!item) return;
      item.classList.remove('current', 'passed');
      if (i === currentIndex) item.classList.add('current');
      else if (i < currentIndex) item.classList.add('passed');
    });

    // Scroll current item into view in mobile horizontal mode
    var current = document.getElementById('ladder-item-' + currentIndex);
    if (current) {
      current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  /* ============================================================
     ROUND SUMMARY
     ============================================================ */
  function renderRoundSummary(roundNumber, roundEarnings, totalScore, roundsLeft) {
    var html = '<div class="screen summary-screen">' +
      '<div class="summary-content">' +
        '<span class="summary-check anim-scaleIn" aria-hidden="true">✅</span>' +
        '<h2 class="summary-title anim-slideUp">Round ' + roundNumber + ' Complete!</h2>' +
        '<div class="summary-stats anim-fadeInUp">' +
          '<div class="summary-stat">' +
            '<span class="summary-stat-label">Round Earnings</span>' +
            '<span class="summary-stat-value text-correct">' + formatMoneyFull(roundEarnings) + '</span>' +
          '</div>' +
          '<div class="summary-stat">' +
            '<span class="summary-stat-label">Total Score</span>' +
            '<span class="summary-stat-value">' + formatMoneyFull(totalScore) + '</span>' +
          '</div>' +
          '<div class="summary-stat">' +
            '<span class="summary-stat-label">Rounds Remaining</span>' +
            '<span class="summary-stat-value">' + (roundsLeft || 0) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="anim-fadeInUp stagger-2">' +
          (roundsLeft > 0
            ? '<button class="btn btn-primary" data-action="next-round">Continue →</button>'
            : '<button class="btn btn-primary" data-action="finish-game">See Final Score</button>'
          ) +
        '</div>' +
      '</div>' +
      '</div>';
    setApp(html);
  }

  /* ============================================================
     GAME OVER
     ============================================================ */
  function renderGameOver(totalScore, isHighScore) {
    var trophy = totalScore > 100000 ? '🏆' : totalScore > 50000 ? '🥈' : totalScore > 0 ? '🥉' : '💔';
    var subtitle = totalScore > 100000
      ? 'Incredible! You\'re a Trivia Millionaire!'
      : totalScore > 50000
      ? 'Excellent performance!'
      : totalScore > 10000
      ? 'Great effort — keep practicing!'
      : 'Better luck next time!';

    var html = '<div class="screen game-over-screen">' +
      '<div class="spotlight-overlay"></div>' +
      '<div class="game-over-content">' +
        '<span class="game-over-trophy anim-scaleIn" aria-hidden="true">' + trophy + '</span>' +
        '<h1 class="game-over-title title-shimmer anim-fadeInUp">Game Over</h1>' +
        '<p class="game-over-subtitle anim-fadeIn">' + escapeHtml(subtitle) + '</p>' +
        '<div class="final-score-display anim-scaleIn">' +
          '<div class="final-score-label">Final Score</div>' +
          '<div class="final-score-amount">' + formatMoneyFull(totalScore) + '</div>' +
          (isHighScore ? '<div class="new-high-score" role="alert"><span aria-hidden="true">⭐</span> NEW HIGH SCORE! <span aria-hidden="true">⭐</span></div>' : '') +
        '</div>' +
        '<p class="disclaimer">For entertainment purposes only. No money is payable.</p>' +
        '<div class="game-over-actions anim-fadeInUp">' +
          '<button class="btn btn-primary" data-action="play-again"><span aria-hidden="true">▶</span> Play Again</button>' +
          '<button class="btn btn-secondary" data-action="show-title"><span aria-hidden="true">🏠</span> Main Menu</button>' +
        '</div>' +
      '</div>' +
      '</div>';

    setApp(html);
  }

  /* ============================================================
     LIFELINE OVERLAYS
     ============================================================ */
  function renderLifelineOverlay(type, data) {
    if (type === 'askAudience') {
      renderAudienceOverlay(data);
    } else if (type === 'phoneAFriend') {
      renderPhoneOverlay(data);
    }
  }

  function renderAudienceOverlay(data) {
    var letters = ['A', 'B', 'C', 'D'];
    var barsHtml = data.percentages.map(function(pct, i) {
      return '<div class="audience-bar-wrap">' +
        '<div class="audience-pct">' + pct + '%</div>' +
        '<div class="audience-bar" id="abar-' + i + '" style="height:0;max-height:130px"></div>' +
        '<div class="audience-label">' + letters[i] + '</div>' +
        '</div>';
    }).join('');

    var html = '<div class="overlay-backdrop" id="audience-overlay">' +
      '<div class="overlay-panel anim-scaleIn" role="dialog" aria-modal="true" aria-labelledby="audience-overlay-title">' +
        '<div class="overlay-title" id="audience-overlay-title"><span aria-hidden="true">👥</span> Ask the Audience</div>' +
        '<div class="audience-chart">' + barsHtml + '</div>' +
        '<p style="text-align:center; color: var(--text-muted); font-size:0.85rem; margin-bottom:16px">' +
          'The audience has voted!' +
        '</p>' +
        '<div style="text-align:center">' +
          '<button class="btn btn-secondary" data-action="close-overlay">Close</button>' +
        '</div>' +
      '</div>' +
      '</div>';

    setOverlay(html);

    // Animate bars after render
    setTimeout(function() {
      data.percentages.forEach(function(pct, i) {
        var bar = document.getElementById('abar-' + i);
        if (bar) {
          var height = Math.round(130 * pct / 100);
          bar.style.transition = 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
          bar.style.height = height + 'px';
        }
      });
    }, 100);
  }

  function renderPhoneOverlay(data) {
    var html = '<div class="overlay-backdrop" id="phone-overlay">' +
      '<div class="overlay-panel anim-scaleIn" role="dialog" aria-modal="true" aria-labelledby="phone-overlay-title">' +
        '<div class="overlay-title" id="phone-overlay-title"><span aria-hidden="true">📞</span> Phone a Friend</div>' +
        '<div class="phone-dialogue">' +
          '<div class="phone-avatar" aria-hidden="true">🧑‍💼</div>' +
          '<div class="phone-name">' + escapeHtml(data.friendName) + ' says:</div>' +
          '<div class="phone-message" id="phone-msg">' +
            '<span class="typing-indicator">' +
              '<span class="typing-dot"></span>' +
              '<span class="typing-dot"></span>' +
              '<span class="typing-dot"></span>' +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center">' +
          '<button class="btn btn-secondary" data-action="close-overlay" id="phone-close-btn" style="display:none">Close</button>' +
        '</div>' +
      '</div>' +
      '</div>';

    setOverlay(html);

    // Show typing then message
    var delay = 1500 + data.message.length * 10;
    delay = Math.min(delay, 3000);
    setTimeout(function() {
      var msgEl = document.getElementById('phone-msg');
      var closeBtn = document.getElementById('phone-close-btn');
      if (msgEl) msgEl.textContent = data.message;
      if (closeBtn) closeBtn.style.display = 'inline-flex';
    }, delay);
  }

  /* ============================================================
     SOUND TOGGLE BUTTON (persistent across screens)
     ============================================================ */
  function renderSoundToggleBtn() {
    // Remove existing
    var existing = document.getElementById('sound-toggle-btn');
    if (existing) existing.remove();
    var existingPanel = document.getElementById('volume-panel');
    if (existingPanel) existingPanel.remove();

    var settings = SoundSystem.getSettings();

    var btn = document.createElement('button');
    btn.id = 'sound-toggle-btn';
    btn.className = 'btn btn-icon';
    btn.setAttribute('data-action', 'toggle-sound-btn');
    btn.setAttribute('title', 'Sound Settings');
    btn.innerHTML = settings.muted ? '🔇' : '🔊';
    document.body.appendChild(btn);

    var ttsEnabled = TTS.isEnabled();
    var ttsSupported = TTS.isSupported();

    var panel = document.createElement('div');
    panel.id = 'volume-panel';
    panel.className = 'volume-panel hidden';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Sound settings');
    panel.innerHTML =
      '<div class="volume-row">' +
        '<label for="vol-master">Master</label>' +
        '<input id="vol-master" type="range" min="0" max="1" step="0.05" value="' + settings.master + '" data-volume="master" aria-label="Master volume">' +
      '</div>' +
      '<div class="volume-row">' +
        '<label for="vol-sfx">SFX</label>' +
        '<input id="vol-sfx" type="range" min="0" max="1" step="0.05" value="' + settings.sfx + '" data-volume="sfx" aria-label="Sound effects volume">' +
      '</div>' +
      '<div class="volume-row">' +
        '<label for="vol-music">Music Vol</label>' +
        '<input id="vol-music" type="range" min="0" max="1" step="0.05" value="' + settings.music + '" data-volume="music" aria-label="Music volume">' +
      '</div>' +
      '<div class="volume-row">' +
        '<label>Mute</label>' +
        '<button class="btn btn-icon" data-action="mute-toggle" aria-pressed="' + !!settings.muted + '" style="font-size:0.8rem;padding:4px 8px;">' +
          (settings.muted ? 'Unmute' : 'Mute') +
        '</button>' +
      '</div>' +
      '<div class="volume-divider"></div>' +
      '<div class="volume-row">' +
        '<label><span aria-hidden="true">🎵</span> Music</label>' +
        '<div class="music-controls">' +
          '<button class="btn btn-icon" data-action="music-prev" aria-label="Previous track" style="padding:4px 7px;"><span aria-hidden="true">⏮</span></button>' +
          '<button class="btn btn-icon" id="music-play-btn" data-action="music-play-stop" aria-label="Play music" style="padding:4px 9px;"><span aria-hidden="true">▶</span> Play</button>' +
          '<button class="btn btn-icon" data-action="music-next" aria-label="Next track" style="padding:4px 7px;"><span aria-hidden="true">⏭</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="volume-row">' +
        '<label>Track</label>' +
        '<span id="music-track-name" style="font-size:0.75rem;color:var(--gold);flex:1;text-align:right;">Stopped</span>' +
      '</div>' +
      '<div class="volume-divider"></div>' +
      (ttsSupported
        ? '<div class="volume-row">' +
            '<label><span aria-hidden="true">🔈</span> Read Aloud</label>' +
            '<button class="btn btn-icon" id="tts-toggle-btn" data-action="tts-toggle" aria-pressed="' + !!ttsEnabled + '" style="font-size:0.8rem;padding:4px 8px;">' +
              (ttsEnabled ? 'ON' : 'OFF') +
            '</button>' +
          '</div>'
        : '<div class="volume-row"><label style="color:var(--text-muted);font-size:0.75rem;">Read Aloud not supported in this browser</label></div>'
      );
    document.body.appendChild(panel);

    // Volume slider listeners
    panel.querySelectorAll('input[data-volume]').forEach(function(input) {
      input.addEventListener('input', function() {
        var type = input.getAttribute('data-volume');
        var val = parseFloat(input.value);
        if (type === 'master') SoundSystem.setMasterVolume(val);
        else if (type === 'sfx') SoundSystem.setSfxVolume(val);
        else if (type === 'music') SoundSystem.setMusicVolume(val);
      });
    });
  }

  function toggleSoundPanel() {
    var panel = document.getElementById('volume-panel');
    if (panel) panel.classList.toggle('hidden');
  }

  /* ============================================================
     CONFETTI
     ============================================================ */
  function launchConfetti() {
    var layer = document.createElement('div');
    layer.id = 'confetti-layer';
    document.body.appendChild(layer);

    var colors = ['#f5a623', '#00e676', '#ff1744', '#2196f3', '#e91e63', '#9c27b0', '#ffffff'];
    var count = 80;

    for (var i = 0; i < count; i++) {
      (function(idx) {
        var piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.background = colors[idx % colors.length];
        piece.style.width = randomInt(6, 14) + 'px';
        piece.style.height = randomInt(6, 14) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        var duration = randomInt(2000, 4000);
        var delay = randomInt(0, 1500);
        piece.style.animation = 'confettiFall ' + duration + 'ms ease ' + delay + 'ms forwards';
        layer.appendChild(piece);
      })(i);
    }

    setTimeout(function() {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 6000);
  }

  /* ============================================================
     LOADING SCREEN
     ============================================================ */
  function renderLoading() {
    setApp('<div class="screen flex-center">' +
      '<div style="text-align:center">' +
        '<div style="font-size:3rem;animation:pulseScale 1s ease infinite">⏳</div>' +
        '<p style="color:var(--text-secondary);margin-top:16px;font-family:var(--font-heading)">Loading questions...</p>' +
      '</div>' +
      '</div>');
  }

  /* ============================================================
     ERROR SCREEN
     ============================================================ */
  function renderError(message) {
    setApp('<div class="screen flex-center">' +
      '<div style="text-align:center;max-width:400px">' +
        '<div style="font-size:3rem">❌</div>' +
        '<h2 style="color:var(--wrong);margin:16px 0">Error</h2>' +
        '<p style="color:var(--text-secondary)">' + escapeHtml(message) + '</p>' +
        '<button class="btn btn-secondary" data-action="show-title" style="margin-top:24px">Try Again</button>' +
      '</div>' +
      '</div>');
  }

  /* ============================================================
     HIDE OPTION (50:50)
     ============================================================ */
  function hideOptions(indices) {
    var optionBtns = document.querySelectorAll('.option-btn');
    indices.forEach(function(idx) {
      if (optionBtns[idx]) {
        optionBtns[idx].classList.add('hidden-option');
      }
    });
  }

  return {
    init: init,
    renderTitleScreen: renderTitleScreen,
    renderRoundIntro: renderRoundIntro,
    renderCategorySelect: renderCategorySelect,
    renderQuestionScreen: renderQuestionScreen,
    renderAnswerReveal: renderAnswerReveal,
    renderRoundSummary: renderRoundSummary,
    renderGameOver: renderGameOver,
    renderLifelineOverlay: renderLifelineOverlay,
    updateTimerRing: updateTimerRing,
    updateMoneyLadder: updateMoneyLadder,
    renderLoading: renderLoading,
    renderError: renderError,
    hideOptions: hideOptions,
    clearOverlay: clearOverlay,
    toggleSoundPanel: toggleSoundPanel,
    renderSoundToggleBtn: renderSoundToggleBtn,
    launchConfetti: launchConfetti
  };
})();
