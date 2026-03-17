/* ============================================================
   QUESTIONS.JS — Question loading, selection, management
   ============================================================ */

var QuestionManager = (function() {
  var allData = null;
  var usedQuestionIds = new Set();
  var usedCategoryIds = [];

  /**
   * Load questions from questions.json, fallback to window.QUESTION_DATA
   */
  async function loadQuestions() {
    // Try fetch first (works on local server or file:// with proper setup)
    try {
      var response = await fetch('data/questions.json');
      if (response.ok) {
        allData = await response.json();
        return allData;
      }
    } catch (e) {
      // fetch failed — use fallback
    }

    // Fallback: use embedded data
    if (window.QUESTION_DATA) {
      allData = window.QUESTION_DATA;
      return allData;
    }

    throw new Error('Could not load question data');
  }

  /**
   * Reset for a new game
   */
  function reset() {
    usedQuestionIds = new Set();
    usedCategoryIds = [];
  }

  /**
   * Select 3 random category options for the current round
   * Avoids repeating categories used in this game
   * @param {string[]} usedIds - category IDs already used this game
   * @returns {object[]} array of 3 category objects
   */
  function selectCategoriesForRound(usedIds) {
    if (!allData) throw new Error('Questions not loaded');
    var used = usedIds || usedCategoryIds;
    var available = allData.categories.filter(function(c) {
      return !used.includes(c.id);
    });

    // If not enough available, reuse some
    if (available.length < 3) {
      available = allData.categories.slice();
    }

    return shuffle(available).slice(0, 3);
  }

  /**
   * Select 10 questions for a given category, ordered by difficulty asc.
   * Avoids questions already used this game.
   * @param {string} categoryId
   * @param {number} count
   * @returns {object[]}
   */
  function selectQuestionsForCategory(categoryId, count) {
    if (!allData) throw new Error('Questions not loaded');
    count = count || 10;

    var available = allData.questions.filter(function(q) {
      return q.category === categoryId && !usedQuestionIds.has(q.id);
    });

    if (available.length === 0) {
      // Fallback: allow any category questions
      available = allData.questions.filter(function(q) {
        return !usedQuestionIds.has(q.id);
      });
    }

    // Group by difficulty
    var byDiff = {};
    available.forEach(function(q) {
      if (!byDiff[q.difficulty]) byDiff[q.difficulty] = [];
      byDiff[q.difficulty].push(q);
    });

    // We need 10 questions: 2 each of difficulty 1-5
    var selected = [];
    var difficulties = [1, 2, 3, 4, 5];
    difficulties.forEach(function(d) {
      var pool = byDiff[d] || [];
      var picks = shuffle(pool).slice(0, 2);
      selected = selected.concat(picks);
    });

    // If we don't have 10 yet, fill with remaining available
    if (selected.length < count) {
      var selectedIds = new Set(selected.map(function(q) { return q.id; }));
      var extras = shuffle(available.filter(function(q) {
        return !selectedIds.has(q.id);
      }));
      selected = selected.concat(extras.slice(0, count - selected.length));
    }

    // Sort by difficulty asc, then shuffle within same difficulty
    selected.sort(function(a, b) {
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      return Math.random() - 0.5;
    });

    // Mark as used
    selected.forEach(function(q) {
      usedQuestionIds.add(q.id);
    });

    // Track category as used
    if (!usedCategoryIds.includes(categoryId)) {
      usedCategoryIds.push(categoryId);
    }

    return selected.slice(0, count);
  }

  /**
   * Mark a category as used
   */
  function markCategoryUsed(categoryId) {
    if (!usedCategoryIds.includes(categoryId)) {
      usedCategoryIds.push(categoryId);
    }
  }

  /**
   * Get all categories
   */
  function getCategories() {
    if (!allData) return [];
    return allData.categories;
  }

  return {
    loadQuestions: loadQuestions,
    reset: reset,
    selectCategoriesForRound: selectCategoriesForRound,
    selectQuestionsForCategory: selectQuestionsForCategory,
    markCategoryUsed: markCategoryUsed,
    getCategories: getCategories,
    isLoaded: function() { return !!allData; }
  };
})();
