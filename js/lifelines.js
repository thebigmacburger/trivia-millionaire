/* ============================================================
   LIFELINES.JS — 50:50, Ask the Audience, Phone a Friend
   ============================================================ */

function Lifelines() {
  this.used = {
    fiftyFifty: false,
    askAudience: false,
    phoneAFriend: false
  };
}

/**
 * Reset all lifelines for a new game
 */
Lifelines.prototype.reset = function() {
  this.used = {
    fiftyFifty: false,
    askAudience: false,
    phoneAFriend: false
  };
};

/**
 * 50:50 — Returns array of 2 indices to HIDE (keep correct + 1 random wrong)
 * @param {object} question
 * @returns {number[]} indices to hide
 */
Lifelines.prototype.fiftyFifty = function(question) {
  if (this.used.fiftyFifty) return [];
  this.used.fiftyFifty = true;

  var correct = question.answer;
  var wrong = [];
  for (var i = 0; i < question.options.length; i++) {
    if (i !== correct) wrong.push(i);
  }
  // Keep 1 random wrong, hide the other 2
  var shuffledWrong = shuffle(wrong);
  var toHide = shuffledWrong.slice(1); // hide all but first wrong
  return toHide;
};

/**
 * Ask the Audience — Returns percentages for each option
 * Correct answer gets 40-70%, rest distributed randomly
 * @param {object} question
 * @returns {{percentages: number[]}}
 */
Lifelines.prototype.askAudience = function(question) {
  if (this.used.askAudience) return { percentages: [25, 25, 25, 25] };
  this.used.askAudience = true;

  var n = question.options.length;
  var correct = question.answer;
  var correctPct = randomInt(40, 70);
  var remaining = 100 - correctPct;

  // Distribute remaining among wrong options
  var wrongIndices = [];
  for (var i = 0; i < n; i++) {
    if (i !== correct) wrongIndices.push(i);
  }

  var splits = randomSplits(remaining, wrongIndices.length);
  var percentages = new Array(n).fill(0);
  percentages[correct] = correctPct;
  wrongIndices.forEach(function(idx, i) {
    percentages[idx] = splits[i];
  });

  return { percentages: percentages };
};

/**
 * Phone a Friend — Returns a message hinting at the correct answer
 * @param {object} question
 * @returns {{message: string, friendName: string}}
 */
Lifelines.prototype.phoneAFriend = function(question) {
  if (this.used.phoneAFriend) return { message: 'Sorry, I already used this lifeline!', friendName: 'Friend' };
  this.used.phoneAFriend = true;

  var correct = question.options[question.answer];
  var explanation = question.explanation || '';

  var friends = ['Alex', 'Jordan', 'Sam', 'Morgan', 'Taylor', 'Casey'];
  var friendName = friends[randomInt(0, friends.length - 1)];

  // Generate a hint message based on explanation or correct answer
  var messages = [];

  if (explanation && explanation.length > 20) {
    // Extract a hint from the explanation
    var hint = explanation;
    // Shorten if too long
    if (hint.length > 120) {
      hint = hint.substring(0, 117) + '...';
    }
    messages.push(
      "Hmm, I'm pretty sure the answer is \"" + correct + "\". " + hint,
      "I think it's \"" + correct + "\"! I remember reading that " + hint.toLowerCase(),
      "Oh! I know this one. It's \"" + correct + "\". " + hint
    );
  } else {
    messages.push(
      "I'm fairly confident the answer is \"" + correct + "\", but don't quote me on it!",
      "I'd go with \"" + correct + "\" on this one. Seems right to me!",
      "My gut says \"" + correct + "\". I'm about 80% sure on that one.",
      "Based on what I remember, I think \"" + correct + "\" is correct!"
    );
  }

  var message = messages[randomInt(0, messages.length - 1)];

  return {
    message: message,
    friendName: friendName
  };
};

/**
 * Check if a lifeline has been used
 */
Lifelines.prototype.isUsed = function(type) {
  return !!this.used[type];
};

/**
 * Get state of all lifelines
 */
Lifelines.prototype.getState = function() {
  return Object.assign({}, this.used);
};

/* ---- Helper ---- */
function randomSplits(total, n) {
  if (n === 1) return [total];
  if (n === 2) {
    var a = randomInt(Math.floor(total * 0.2), Math.floor(total * 0.8));
    return [a, total - a];
  }
  // n=3
  var splits = [];
  var rem = total;
  for (var i = 0; i < n - 1; i++) {
    var min = Math.floor(rem * 0.1);
    var max = Math.floor(rem * 0.7);
    var val = randomInt(min, max);
    splits.push(val);
    rem -= val;
  }
  splits.push(rem);
  return splits;
}
