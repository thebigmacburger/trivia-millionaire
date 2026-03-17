/* ============================================================
   SOUND.JS — Web Audio API sound system
   ============================================================ */

var SoundSystem = (function() {
  var ctx = null;
  var masterGain = null;
  var sfxGain = null;
  var musicGain = null;
  var bgNode = null;
  var bgLfo = null;
  var initialized = false;
  var muted = false;

  /* ---- External music (MP3) player ---- */
  var musicAudio = null;
  var mediaSource = null;
  var musicPlaying = false;
  var currentTrackIndex = 0;
  var playlist = [
    { name: 'Background Track 1', url: 'audio/background1.mp3' },
    { name: 'Background Track 2', url: 'audio/background2.mp3' },
    { name: 'Background Track 3', url: 'audio/background3.mp3' }
  ];

  var settings = {
    master: 0.7,
    sfx: 0.8,
    music: 0.3,
    muted: false
  };

  function loadSettings() {
    try {
      var saved = localStorage.getItem('triviaSound');
      if (saved) {
        var parsed = JSON.parse(saved);
        settings = Object.assign(settings, parsed);
      }
    } catch (e) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem('triviaSound', JSON.stringify(settings));
    } catch (e) {}
  }

  function initCtx() {
    if (initialized) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      sfxGain = ctx.createGain();
      musicGain = ctx.createGain();

      sfxGain.connect(masterGain);
      musicGain.connect(masterGain);
      masterGain.connect(ctx.destination);

      applyVolumes();
      initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available', e);
    }
  }

  function applyVolumes() {
    if (!initialized) return;
    var m = settings.muted ? 0 : settings.master;
    masterGain.gain.setTargetAtTime(m, ctx.currentTime, 0.05);
    sfxGain.gain.setTargetAtTime(settings.sfx, ctx.currentTime, 0.05);
    musicGain.gain.setTargetAtTime(settings.music, ctx.currentTime, 0.05);
  }

  function safePlay(fn) {
    if (!initialized) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(fn).catch(function() {});
    } else {
      try { fn(); } catch(e) {}
    }
  }

  /* ---- Sound builders ---- */

  function playTone(freq, type, duration, startVol, endVol, destination, startTime) {
    if (!initialized) return null;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, startTime || ctx.currentTime);
    gain.gain.setValueAtTime(startVol !== undefined ? startVol : 0.5, startTime || ctx.currentTime);
    if (endVol !== undefined) {
      gain.gain.linearRampToValueAtTime(endVol, (startTime || ctx.currentTime) + duration);
    }
    osc.connect(gain);
    gain.connect(destination || sfxGain);
    osc.start(startTime || ctx.currentTime);
    osc.stop((startTime || ctx.currentTime) + duration + 0.01);
    return { osc: osc, gain: gain };
  }

  function playNoise(duration, vol, destination) {
    if (!initialized) return;
    var bufferSize = Math.ceil(ctx.sampleRate * duration);
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    var source = ctx.createBufferSource();
    source.buffer = buffer;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(destination || sfxGain);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + duration + 0.01);
  }

  /* ---- Individual sounds ---- */

  function playClick() {
    safePlay(function() {
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(400, t + 0.1);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  function playCorrect() {
    safePlay(function() {
      var t = ctx.currentTime;
      // Major chord arpeggio C-E-G using triangle
      var freqs = [523.25, 659.25, 784.0]; // C5, E5, G5
      freqs.forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var start = t + i * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.4, start + 0.05);
        gain.gain.linearRampToValueAtTime(0, start + 0.4);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(start);
        osc.stop(start + 0.45);
      });
    });
  }

  function playWrong() {
    safePlay(function() {
      var t = ctx.currentTime;
      // Dissonant sawtooth
      [150, 160, 155].forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    });
  }

  function playTick() {
    safePlay(function() {
      playNoise(0.03, 0.15, sfxGain);
    });
  }

  function playUrgentTick() {
    safePlay(function() {
      var t = ctx.currentTime;
      playNoise(0.03, 0.2, sfxGain);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.06);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  function playRoundIntro() {
    safePlay(function() {
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.linearRampToValueAtTime(1000, t + 1.5);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.linearRampToValueAtTime(0, t + 1.5);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 1.6);
    });
  }

  function playLifeline() {
    safePlay(function() {
      var t = ctx.currentTime;
      for (var i = 0; i < 8; i++) {
        var freq = randomInt(800, 2000);
        var start = t + i * 0.06;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.linearRampToValueAtTime(0, start + 0.05);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(start);
        osc.stop(start + 0.07);
      }
    });
  }

  function playFinalAnswer() {
    safePlay(function() {
      var t = ctx.currentTime;
      // Low sine
      var osc1 = ctx.createOscillator();
      var gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(80, t);
      gain1.gain.setValueAtTime(0.4, t);
      gain1.gain.linearRampToValueAtTime(0, t + 0.5);
      osc1.connect(gain1);
      gain1.connect(sfxGain);
      osc1.start(t);
      osc1.stop(t + 0.55);
      // Noise burst
      playNoise(0.15, 0.2, sfxGain);
    });
  }

  function playVictoryFanfare() {
    safePlay(function() {
      // Major scale C4-C5
      var scale = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
      var t = ctx.currentTime;
      scale.forEach(function(freq, i) {
        var start = t + i * 0.12;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.4, start + 0.04);
        gain.gain.linearRampToValueAtTime(0, start + 0.2);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    });
  }

  function playGameOver() {
    safePlay(function() {
      // Descending minor scale
      var scale = [392.0, 349.23, 329.63, 293.66, 261.63, 246.94, 220.0, 196.0];
      var t = ctx.currentTime;
      scale.forEach(function(freq, i) {
        var start = t + i * 0.2;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.35, start + 0.05);
        gain.gain.linearRampToValueAtTime(0, start + 0.3);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    });
  }

  function startAmbience() {
    if (!initialized || bgNode) return;
    safePlay(function() {
      try {
        // Layered sine drone
        var freqs = [60, 120, 180];
        var nodes = [];
        var mixGain = ctx.createGain();
        mixGain.gain.setValueAtTime(0, ctx.currentTime);
        mixGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
        mixGain.connect(musicGain);

        freqs.forEach(function(freq) {
          var osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.connect(mixGain);
          osc.start(ctx.currentTime);
          nodes.push(osc);
        });

        // Slow LFO on gain
        var lfo = ctx.createOscillator();
        var lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
        lfoGain.gain.setValueAtTime(0.03, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(mixGain.gain);
        lfo.start(ctx.currentTime);

        bgNode = { nodes: nodes, mixGain: mixGain, lfo: lfo };
      } catch(e) {}
    });
  }

  /* ---- MP3 music player helpers ---- */

  function createMusicAudio() {
    if (musicAudio) return;
    musicAudio = new Audio();
    musicAudio.loop = false;
    musicAudio.addEventListener('ended', function() {
      nextMusicTrack();
    });
    musicAudio.addEventListener('error', function() {
      setTimeout(function() { nextMusicTrack(); }, 500);
    });
  }

  function connectMusicAudio() {
    if (!initialized || !musicAudio || mediaSource) return;
    try {
      mediaSource = ctx.createMediaElementSource(musicAudio);
      mediaSource.connect(musicGain);
    } catch(e) {
      console.warn('Could not connect music audio to Web Audio API:', e);
    }
  }

  function playMusicTrack(index) {
    if (!initialized) { initCtx(); }
    if (!musicAudio) createMusicAudio();
    connectMusicAudio();

    if (!playlist.length) return;
    currentTrackIndex = ((index % playlist.length) + playlist.length) % playlist.length;
    var track = playlist[currentTrackIndex];

    // Stop synth ambience while external music plays
    stopAmbience();

    musicAudio.src = track.url;
    musicAudio.play().then(function() {
      musicPlaying = true;
      updateMusicUI();
    }).catch(function() {
      musicPlaying = false;
      updateMusicUI();
    });
  }

  function stopMusicTrack() {
    if (musicAudio) {
      musicAudio.pause();
      musicAudio.currentTime = 0;
      musicAudio.src = '';
    }
    musicPlaying = false;
    updateMusicUI();
  }

  function nextMusicTrack() {
    playMusicTrack(currentTrackIndex + 1);
  }

  function prevMusicTrack() {
    playMusicTrack(currentTrackIndex - 1);
  }

  function updateMusicUI() {
    var trackNameEl = document.getElementById('music-track-name');
    var playBtn = document.getElementById('music-play-btn');
    if (trackNameEl) {
      trackNameEl.textContent = musicPlaying
        ? playlist[currentTrackIndex].name
        : 'Stopped';
    }
    if (playBtn) {
      playBtn.textContent = musicPlaying ? '⏹ Stop' : '▶ Play';
    }
  }

  function stopAmbience() {
    if (!bgNode || !initialized) return;
    try {
      var t = ctx.currentTime;
      bgNode.mixGain.gain.linearRampToValueAtTime(0, t + 1);
      var nodes = bgNode.nodes;
      var lfo = bgNode.lfo;
      setTimeout(function() {
        try {
          nodes.forEach(function(n) { n.stop(); });
          lfo.stop();
        } catch(e) {}
      }, 1200);
      bgNode = null;
    } catch(e) {}
  }

  /* ---- Public API ---- */
  return {
    init: function() {
      loadSettings();
    },

    activate: function() {
      if (!initialized) {
        initCtx();
        startAmbience();
      } else if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    },

    click:          function() { playClick(); },
    correct:        function() { playCorrect(); },
    wrong:          function() { playWrong(); },
    tick:           function() { playTick(); },
    urgentTick:     function() { playUrgentTick(); },
    roundIntro:     function() { playRoundIntro(); },
    lifeline:       function() { playLifeline(); },
    finalAnswer:    function() { playFinalAnswer(); },
    victory:        function() { playVictoryFanfare(); },
    gameOver:       function() { playGameOver(); },
    startAmbience:  startAmbience,
    stopAmbience:   stopAmbience,

    setMasterVolume: function(v) {
      settings.master = clamp(v, 0, 1);
      if (initialized) applyVolumes();
      saveSettings();
    },

    setSfxVolume: function(v) {
      settings.sfx = clamp(v, 0, 1);
      if (initialized && sfxGain) sfxGain.gain.setTargetAtTime(settings.sfx, ctx.currentTime, 0.05);
      saveSettings();
    },

    setMusicVolume: function(v) {
      settings.music = clamp(v, 0, 1);
      if (initialized && musicGain) musicGain.gain.setTargetAtTime(settings.music, ctx.currentTime, 0.05);
      saveSettings();
    },

    toggleMute: function() {
      settings.muted = !settings.muted;
      if (initialized) applyVolumes();
      saveSettings();
      return settings.muted;
    },

    isMuted: function() { return settings.muted; },
    getSettings: function() { return Object.assign({}, settings); },

    isInitialized: function() { return initialized; },

    /* Music player */
    playMusic:       function(index) { playMusicTrack(index !== undefined ? index : currentTrackIndex); },
    stopMusic:       stopMusicTrack,
    nextTrack:       nextMusicTrack,
    prevTrack:       prevMusicTrack,
    isMusicPlaying:  function() { return musicPlaying; },
    getCurrentTrack: function() { return playlist[currentTrackIndex]; },
    getPlaylist:     function() { return playlist.slice(); },
    setPlaylist:     function(tracks) { playlist = tracks.slice(); currentTrackIndex = 0; }
  };
})();
