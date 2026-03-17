# Trivia Millionaire

A browser-based trivia game show inspired by *Who Wants to Be a Millionaire?*
6 rounds, 60 questions, $192,000 to win. No server required — just open `index.html`.

## Features

- 130+ questions across 8 categories (Science, History, Geography, Entertainment, Sports, Technology, Literature, General Knowledge)
- Money ladder scoring with safe havens
- 3 lifelines: 50:50, Ask the Audience, Phone a Friend
- Countdown timer per question (difficulty-scaled)
- Synthesized sound effects via Web Audio API
- Background music player (MP3)
- Text-to-speech narration (browser Speech Synthesis API)
- High scores saved to localStorage
- Responsive layout (desktop, tablet, mobile)

## Background Music Credits

The background music tracks included with this game are sourced from
[Freesound](https://freesound.org) under their respective licenses:

| File | Title / Author | Source |
|------|---------------|--------|
| `audio/background1.mp3` | **Timbre** | https://freesound.org/people/Timbre/sounds/94897/ |
| `audio/background2.mp3` | **TheoJT** | https://freesound.org/people/TheoJT/sounds/511436/ |
| `audio/background3.mp3` | **TheoJT** | https://freesound.org/people/TheoJT/sounds/698508/ |

Please visit each link to view the full license terms for each sound.

## How to Play

1. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
2. Click **Start Game**.
3. Choose a category each round.
4. Answer 10 questions per round — get as many right as possible before the timer runs out.
5. Use lifelines wisely; each can only be used once per game.
6. Complete all 6 rounds for the best possible score.

## Sound Settings

Click the **🔊** button (bottom-right corner) to open the sound panel:

- **Master / SFX / Music Vol** — independent volume sliders
- **Mute** — silence everything
- **Music controls** — ⏮ / ▶ Play / ⏭ to control background music playback
- **Read Aloud** — toggle text-to-speech narration of questions and answers

## Adding Your Own Music

Drop MP3 files into the `audio/` folder named:

```
audio/background1.mp3
audio/background2.mp3
audio/background3.mp3
```

Or open the browser console and call:

```js
SoundSystem.setPlaylist([
  { name: 'My Track', url: 'audio/mytrack.mp3' }
]);
```
