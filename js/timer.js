/* ============================================================
   TIMER.JS — requestAnimationFrame-based countdown timer
   ============================================================ */

function Timer() {
  this._duration = 0;
  this._remaining = 0;
  this._startTime = 0;
  this._pausedAt = 0;
  this._running = false;
  this._paused = false;
  this._rafId = null;
  this._onTick = null;
  this._onExpire = null;
  this._lastTickSecond = -1;
}

Timer.prototype.start = function(seconds, onTick, onExpire) {
  this.stop();
  this._duration = seconds;
  this._remaining = seconds;
  this._onTick = onTick || null;
  this._onExpire = onExpire || null;
  this._running = true;
  this._paused = false;
  this._startTime = performance.now();
  this._lastTickSecond = seconds;
  this._tick();
};

Timer.prototype._tick = function() {
  if (!this._running || this._paused) return;
  var self = this;
  this._rafId = requestAnimationFrame(function(now) {
    if (!self._running) return;
    var elapsed = (now - self._startTime) / 1000;
    var remaining = Math.max(0, self._duration - elapsed);
    self._remaining = remaining;
    var fraction = remaining / self._duration;

    // Fire onTick callback
    if (self._onTick) {
      self._onTick(remaining, fraction);
    }

    if (remaining <= 0) {
      self._running = false;
      if (self._onExpire) self._onExpire();
      return;
    }

    self._tick();
  });
};

Timer.prototype.stop = function() {
  this._running = false;
  this._paused = false;
  if (this._rafId) {
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }
};

Timer.prototype.pause = function() {
  if (!this._running || this._paused) return;
  this._paused = true;
  this._pausedAt = performance.now();
  if (this._rafId) {
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }
};

Timer.prototype.resume = function() {
  if (!this._running || !this._paused) return;
  // Adjust start time to account for pause duration
  var pauseDuration = performance.now() - this._pausedAt;
  this._startTime += pauseDuration;
  this._paused = false;
  this._tick();
};

Timer.prototype.getRemaining = function() {
  return this._remaining;
};

Timer.prototype.isRunning = function() {
  return this._running && !this._paused;
};
