/* ============================================================
   SCORES.JS — Money ladder, high scores, earnings logic
   ============================================================ */

var MONEY_LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000];
var SAFE_HAVEN_INDEX = 4; // index 4 = $1,000

var Scores = (function() {
  var STORAGE_KEY = 'triviaHighScores';
  var MAX_SCORES = 5;

  /**
   * Get high scores from localStorage, sorted descending
   */
  function getHighScores() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var scores = JSON.parse(raw);
      if (!Array.isArray(scores)) return [];
      return scores
        .filter(function(s) { return s && typeof s.score === 'number'; })
        .sort(function(a, b) { return b.score - a.score; })
        .slice(0, MAX_SCORES);
    } catch (e) {
      return [];
    }
  }

  /**
   * Save a new high score. Returns true if it made the top 5.
   */
  function saveHighScore(score) {
    if (!score || score <= 0) return false;
    var scores = getHighScores();
    var entry = {
      score: score,
      date: new Date().toISOString()
    };
    scores.push(entry);
    scores.sort(function(a, b) { return b.score - a.score; });
    scores = scores.slice(0, MAX_SCORES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (e) {}
    // Return true if the new score made it into top 5
    return scores.some(function(s) { return s.score === score && s.date === entry.date; });
  }

  /**
   * Check if a score would be a high score (without saving)
   */
  function isHighScore(score) {
    if (!score || score <= 0) return false;
    var scores = getHighScores();
    if (scores.length < MAX_SCORES) return true;
    return score > scores[scores.length - 1].score;
  }

  /**
   * Get the money value for a question index (0-based) if answered correctly
   */
  function getMoneyForQuestion(questionIndex) {
    if (questionIndex < 0 || questionIndex >= MONEY_LADDER.length) return 0;
    return MONEY_LADDER[questionIndex];
  }

  /**
   * Get current safe haven amount based on question index reached
   * If questionIndex > SAFE_HAVEN_INDEX, safe haven is MONEY_LADDER[SAFE_HAVEN_INDEX]
   * Otherwise safe haven is 0
   */
  function getSafeHavenAmount(questionIndex) {
    if (questionIndex > SAFE_HAVEN_INDEX) {
      return MONEY_LADDER[SAFE_HAVEN_INDEX];
    }
    return 0;
  }

  /**
   * Calculate round earnings based on question reached and whether correct
   * - If correct at questionIndex: earn MONEY_LADDER[questionIndex]
   * - If wrong at questionIndex:
   *   - If questionIndex > SAFE_HAVEN_INDEX: earn MONEY_LADDER[SAFE_HAVEN_INDEX]
   *   - If questionIndex <= SAFE_HAVEN_INDEX: earn 0
   * - If timed out: same as wrong
   */
  function getCurrentRoundEarnings(questionIndex, correct) {
    if (correct) {
      return getMoneyForQuestion(questionIndex);
    }
    // Wrong or timeout
    return getSafeHavenAmount(questionIndex);
  }

  /**
   * Get the timer duration (in seconds) for a given difficulty level
   */
  function getTimerDuration(difficulty) {
    if (difficulty <= 2) return 30;
    if (difficulty <= 4) return 45;
    return 60;
  }

  return {
    getHighScores: getHighScores,
    saveHighScore: saveHighScore,
    isHighScore: isHighScore,
    getMoneyForQuestion: getMoneyForQuestion,
    getSafeHavenAmount: getSafeHavenAmount,
    getCurrentRoundEarnings: getCurrentRoundEarnings,
    getTimerDuration: getTimerDuration
  };
})();
