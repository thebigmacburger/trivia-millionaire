/* ============================================================
   GAME.JS — State machine, game coordinator
   ============================================================ */

var Game = (function() {

  /* ---- State constants ---- */
  var STATES = {
    TITLE: 'TITLE',
    ROUND_INTRO: 'ROUND_INTRO',
    CATEGORY_SELECT: 'CATEGORY_SELECT',
    QUESTION: 'QUESTION',
    ANSWER_REVEAL: 'ANSWER_REVEAL',
    ROUND_SUMMARY: 'ROUND_SUMMARY',
    GAME_OVER: 'GAME_OVER'
  };

  /* ---- Game config ---- */
  var TOTAL_ROUNDS = 6;
  var QUESTIONS_PER_ROUND = 10;

  /* ---- Game state ---- */
  var state = STATES.TITLE;
  var currentRound = 0;
  var currentQuestionIndex = 0;
  var totalScore = 0;
  var roundEarnings = 0;
  var currentQuestions = [];
  var currentCategories = [];
  var selectedCategory = null;
  var answerLocked = false;
  var roundsUsedCategories = [];
  var gameTimer = null;
  var lifelines = null;
  var roundCorrect = 0;
  var autoAdvanceTimeout = null;

  /* ---- Init ---- */
  function init() {
    UI.init();
    SoundSystem.init();
    gameTimer = new Timer();

    // Show loading then title
    UI.renderLoading();

    QuestionManager.loadQuestions().then(function() {
      showTitle();
    }).catch(function(err) {
      console.error('Failed to load questions:', err);
      UI.renderError('Failed to load questions. Please refresh the page.');
    });
  }

  /* ---- State transitions ---- */

  function setState(newState) {
    state = newState;
  }

  function showTitle() {
    setState(STATES.TITLE);
    gameTimer.stop();
    var scores = Scores.getHighScores();
    UI.renderTitleScreen(scores);
    UI.renderSoundToggleBtn();
  }

  function startGame() {
    SoundSystem.activate();
    SoundSystem.click();

    // Reset all game state
    currentRound = 0;
    totalScore = 0;
    roundsUsedCategories = [];
    QuestionManager.reset();
    lifelines = new Lifelines();

    nextRound();
  }

  function nextRound() {
    currentRound++;
    roundEarnings = 0;
    roundCorrect = 0;

    if (currentRound > TOTAL_ROUNDS) {
      finishGame();
      return;
    }

    setState(STATES.ROUND_INTRO);
    UI.renderRoundIntro(currentRound);
    SoundSystem.roundIntro();

    // Auto-advance to category select after a delay
    clearAutoAdvance();
    autoAdvanceTimeout = setTimeout(function() {
      showCategorySelect();
    }, 3000);
  }

  function showCategorySelect() {
    clearAutoAdvance();
    setState(STATES.CATEGORY_SELECT);
    try {
      currentCategories = QuestionManager.selectCategoriesForRound(roundsUsedCategories);
    } catch (e) {
      console.error(e);
      currentCategories = QuestionManager.getCategories().slice(0, 3);
    }
    UI.renderCategorySelect(currentCategories);
  }

  function selectCategory(categoryId) {
    SoundSystem.click();
    selectedCategory = categoryId;
    roundsUsedCategories.push(categoryId);

    try {
      currentQuestions = QuestionManager.selectQuestionsForCategory(categoryId, QUESTIONS_PER_ROUND);
    } catch (e) {
      console.error('Error selecting questions:', e);
      currentQuestions = [];
    }

    currentQuestionIndex = 0;
    showQuestion();
  }

  function showQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
      // All questions done — round complete
      endRound(true);
      return;
    }

    setState(STATES.QUESTION);
    answerLocked = false;
    var question = currentQuestions[currentQuestionIndex];

    UI.renderQuestionScreen(
      question,
      currentQuestionIndex + 1,
      currentQuestions.length,
      lifelines,
      currentRound
    );

    UI.updateMoneyLadder(currentQuestionIndex);

    // Read question aloud
    TTS.speak(TTS.buildQuestionText(question, currentQuestionIndex + 1));

    // Start timer
    var duration = Scores.getTimerDuration(question.difficulty);
    var lastTickSecond = duration + 1;

    gameTimer.start(duration, function(remaining, fraction) {
      UI.updateTimerRing(fraction, remaining);

      var sec = Math.ceil(remaining);
      if (sec !== lastTickSecond) {
        lastTickSecond = sec;
        if (sec <= 5 && sec > 0) {
          SoundSystem.urgentTick();
        } else if (sec <= 10 && sec > 0) {
          SoundSystem.tick();
        }
      }
    }, function() {
      handleTimeout();
    });
  }

  function selectAnswer(optionIndex) {
    if (answerLocked) return;
    if (state !== STATES.QUESTION) return;

    answerLocked = true;
    gameTimer.stop();
    TTS.stop();

    var question = currentQuestions[currentQuestionIndex];
    var correct = optionIndex === question.answer;

    SoundSystem.finalAnswer();

    // Delay then reveal
    setTimeout(function() {
      revealAnswer(optionIndex, correct);
    }, 600);
  }

  function revealAnswer(selectedIndex, correct) {
    setState(STATES.ANSWER_REVEAL);
    var question = currentQuestions[currentQuestionIndex];

    UI.renderAnswerReveal(question, selectedIndex, correct);
    UI.updateMoneyLadder(currentQuestionIndex);

    if (correct) {
      SoundSystem.correct();
      roundEarnings = Scores.getMoneyForQuestion(currentQuestionIndex);
      roundCorrect++;
    } else {
      SoundSystem.wrong();
      // Drop to safe haven
      var safeAmount = Scores.getSafeHavenAmount(currentQuestionIndex);
      roundEarnings = safeAmount;
    }

    // Read result aloud
    var timedOut = (selectedIndex === null || selectedIndex === undefined);
    setTimeout(function() {
      TTS.speak(TTS.buildResultText(question, selectedIndex, correct, timedOut));
    }, 600);

    // If wrong answer, auto-advance to round summary after delay (no "next question")
    if (!correct) {
      clearAutoAdvance();
      autoAdvanceTimeout = setTimeout(function() {
        endRound(false);
      }, 3500);

      // Update next button to say "End Round"
      setTimeout(function() {
        var nextWrap = document.getElementById('next-btn-wrap');
        if (nextWrap) {
          nextWrap.innerHTML = '<button class="btn btn-primary" data-action="end-round-early">End Round</button>';
        }
      }, 900);
    }
  }

  function nextQuestion() {
    clearAutoAdvance();
    if (state !== STATES.ANSWER_REVEAL) return;

    var question = currentQuestions[currentQuestionIndex];
    // Only advance if last answer was correct (wrong answers end round)
    currentQuestionIndex++;

    if (currentQuestionIndex >= currentQuestions.length) {
      // Completed all questions in round
      endRound(true);
    } else {
      showQuestion();
    }
  }

  function handleTimeout() {
    if (answerLocked) return;
    if (state !== STATES.QUESTION) return;

    answerLocked = true;
    SoundSystem.wrong();

    // Show timeout state
    revealAnswer(null, false);

    // Update next button
    setTimeout(function() {
      var nextWrap = document.getElementById('next-btn-wrap');
      if (nextWrap) {
        nextWrap.innerHTML = '<button class="btn btn-primary" data-action="end-round-early">⏱ Time\'s Up! End Round</button>';
      }
    }, 900);
  }

  function endRound(completedAll) {
    clearAutoAdvance();
    gameTimer.stop();

    totalScore += roundEarnings;
    setState(STATES.ROUND_SUMMARY);

    if (completedAll && roundEarnings > 0) {
      SoundSystem.victory();
      UI.launchConfetti();
    }

    var roundsLeft = TOTAL_ROUNDS - currentRound;
    UI.renderRoundSummary(currentRound, roundEarnings, totalScore, roundsLeft);
  }

  function finishGame() {
    setState(STATES.GAME_OVER);
    var isNew = Scores.isHighScore(totalScore);
    if (totalScore > 0) {
      Scores.saveHighScore(totalScore);
    }
    if (totalScore > 50000) {
      SoundSystem.victory();
      UI.launchConfetti();
    } else {
      SoundSystem.gameOver();
    }
    UI.renderGameOver(totalScore, isNew);
  }

  /* ---- Lifelines ---- */

  function useLifeline(type) {
    if (!lifelines || lifelines.isUsed(type)) return;
    if (state !== STATES.QUESTION) return;

    SoundSystem.lifeline();
    var question = currentQuestions[currentQuestionIndex];

    if (type === 'fiftyFifty') {
      var toHide = lifelines.fiftyFifty(question);
      UI.hideOptions(toHide);
    } else if (type === 'askAudience') {
      var audienceData = lifelines.askAudience(question);
      UI.renderLifelineOverlay('askAudience', audienceData);
      gameTimer.pause();
    } else if (type === 'phoneAFriend') {
      var phoneData = lifelines.phoneAFriend(question);
      UI.renderLifelineOverlay('phoneAFriend', phoneData);
      gameTimer.pause();
    }
  }

  function closeOverlay() {
    UI.clearOverlay();
    // Resume timer if paused
    if (gameTimer && state === STATES.QUESTION) {
      gameTimer.resume();
    }
  }

  /* ---- Helpers ---- */

  function clearAutoAdvance() {
    if (autoAdvanceTimeout) {
      clearTimeout(autoAdvanceTimeout);
      autoAdvanceTimeout = null;
    }
  }

  /* ---- Action dispatcher (called from app.js event delegation) ---- */

  function dispatch(action, data) {
    switch (action) {
      case 'start-game':
        startGame();
        break;

      case 'next-round':
        SoundSystem.click();
        nextRound();
        break;

      case 'finish-game':
        SoundSystem.click();
        finishGame();
        break;

      case 'next-question':
        SoundSystem.click();
        nextQuestion();
        break;

      case 'end-round-early':
        SoundSystem.click();
        clearAutoAdvance();
        endRound(false);
        break;

      case 'select-category':
        selectCategory(data.categoryId);
        break;

      case 'select-answer':
        selectAnswer(parseInt(data.index, 10));
        break;

      case 'use-lifeline':
        useLifeline(data.lifeline);
        break;

      case 'close-overlay':
        SoundSystem.click();
        closeOverlay();
        break;

      case 'toggle-sound-btn':
        UI.toggleSoundPanel();
        break;

      case 'toggle-sound':
        UI.toggleSoundPanel();
        break;

      case 'mute-toggle':
        var nowMuted = SoundSystem.toggleMute();
        var toggleBtn = document.getElementById('sound-toggle-btn');
        if (toggleBtn) toggleBtn.innerHTML = nowMuted ? '🔇' : '🔊';
        var muteBtn = document.querySelector('[data-action="mute-toggle"]');
        if (muteBtn) muteBtn.textContent = nowMuted ? 'Unmute' : 'Mute';
        break;

      case 'play-again':
        SoundSystem.click();
        startGame();
        break;

      case 'show-title':
        SoundSystem.click();
        showTitle();
        break;

      case 'tts-toggle':
        TTS.setEnabled(!TTS.isEnabled());
        var ttsBtn = document.getElementById('tts-toggle-btn');
        if (ttsBtn) ttsBtn.textContent = TTS.isEnabled() ? 'ON' : 'OFF';
        break;

      case 'music-play-stop':
        if (SoundSystem.isMusicPlaying()) {
          SoundSystem.stopMusic();
        } else {
          SoundSystem.activate();
          SoundSystem.playMusic();
        }
        break;

      case 'music-prev':
        SoundSystem.activate();
        SoundSystem.prevTrack();
        break;

      case 'music-next':
        SoundSystem.activate();
        SoundSystem.nextTrack();
        break;

      default:
        break;
    }
  }

  return {
    init: init,
    dispatch: dispatch,
    getState: function() { return state; }
  };
})();
