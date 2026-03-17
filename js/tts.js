/* ============================================================
   TTS.JS — Text-to-Speech using the Web Speech API
   ============================================================ */

var TTS = (function() {
  var synth = window.speechSynthesis;
  var supported = !!synth;
  var enabled = false;

  function loadSettings() {
    try {
      var val = localStorage.getItem('triviaTTS');
      if (val !== null) enabled = (val === 'true');
    } catch(e) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem('triviaTTS', String(enabled));
    } catch(e) {}
  }

  /* Speak text, cancelling any in-progress utterance first */
  function speak(text) {
    if (!supported || !enabled) return;
    synth.cancel();
    var utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.95;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    synth.speak(utt);
  }

  function stop() {
    if (supported) synth.cancel();
  }

  function setEnabled(val) {
    enabled = !!val;
    saveSettings();
    if (!enabled) stop();
  }

  function isEnabled()   { return enabled; }
  function isSupported() { return supported; }

  /* Build the full narration string for a question */
  function buildQuestionText(question, questionNumber) {
    var letters = ['A', 'B', 'C', 'D'];
    var opts = question.options.map(function(opt, i) {
      return letters[i] + ': ' + opt;
    }).join('. ');
    return 'Question ' + questionNumber + ': ' + question.question + '. ' + opts + '.';
  }

  /* Build the result narration string */
  function buildResultText(question, selectedIndex, correct, timedOut) {
    var letters = ['A', 'B', 'C', 'D'];
    var correctText = letters[question.answer] + ': ' + question.options[question.answer];
    if (timedOut) {
      return 'Time\'s up! The correct answer was ' + correctText + '.';
    } else if (correct) {
      return 'Correct! Well done!';
    } else {
      return 'Wrong! The correct answer was ' + correctText + '.';
    }
  }

  loadSettings();

  return {
    speak:              speak,
    stop:               stop,
    setEnabled:         setEnabled,
    isEnabled:          isEnabled,
    isSupported:        isSupported,
    buildQuestionText:  buildQuestionText,
    buildResultText:    buildResultText
  };
})();
