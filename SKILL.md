---
name: paper-motion
description: Make a short-form reel without recording or editing. An AI voice reads the script, footage of the creator opens the reel with a caption on every word, then it slides down to a code-drawn paper animation in Remotion (notebook grid, stair-stepped serif words, dark cards, mascots). Every visual cue is tied to a word of the voice. Use when the user says "paper motion", "make a reel from this script", "animated reel", "reel without recording myself", or wants a voiceover reel in this style.
---

# Paper Motion

A reel in this format has no talking head and no timeline. The user writes a script, a voice reads it, and you write the edit as code. The first seconds are footage of the user with captions; then the footage slides down and a paper animation explains the idea.

Everything you need is in `template/` next to this file: the kit (`src/kit.tsx`), one example reel to copy (`src/Example.tsx`) and the script that times the voice (`../scripts/words.py`).

## First time

```bash
cp -R <this skill>/template ./paper-motion     # the user's working copy
cd paper-motion && npm install
npx remotion studio src/index.tsx              # the example plays, with a placeholder instead of the clip
```

Needs Node 18+, ffmpeg and the `whisper` command (`pip install openai-whisper`). Check them before starting and say what is missing.

## Phases

| Phase | What it produces | The user approves |
|---|---|---|
| 1. Script | `scripts/<slug>.md`, split into 4-8 blocks of one or two sentences | the words |
| 2. Voice | `public/<slug>-voice.wav` + `src/<slug>.words.json` | by ear: timbre, names, pace |
| 3. Footage + storyboard | 1-3 clips in `public/`, a block-by-block storyboard for the paper part | the storyboard |
| 4. Visuals | `src/<Slug>.tsx`, registered in `src/index.tsx` | the preview in the studio |
| 5. Sound | music the user gives you + a few recorded sounds | by ear |
| 6. Render | the final mp4 | starts only after an explicit ok |

Do not skip an approval. You cannot hear the voice or judge motion: say what you checked and what only the user can judge.

## Steps

**1. Script.** 95-115 words for about 40 seconds. Keep the user's words. Remove stage directions before the voice sees it.

**2. Voice.** Any audio file works. The route this format was built on is [Voicebox](https://github.com/jamiepine/voicebox): free, open source, runs on the user's machine and clones their voice from a short sample. The user generates the voiceover there and exports it. A slightly faster read holds attention better; if the user wants it, speed it up first, then time it:

```bash
ffmpeg -i voice.wav -af atempo=1.1 -ar 48000 -ac 1 public/<slug>-voice.wav
python3 <this skill>/scripts/words.py public/<slug>-voice.wav src/<slug>.words.json
```

Read the transcript the script prints against the script. Whisper misspells names and writes some numbers as digits. Fix the `word` field by hand where it matters, never the times.

**3. Footage.** The hook is always footage of the user: animation alone from the first frame reads as generic. Ask for clips, look at frames before choosing (`ffmpeg -ss 3 -i clip.mp4 -frames:v 1 frame.png`), then cut each one for Remotion:

```bash
ffmpeg -ss <start> -t <seconds> -i <clip> -vf "scale=1080:1920:flags=lanczos,fps=30" -an \
  -c:v libx264 -crf 16 -g 15 -keyint_min 15 -sc_threshold 0 -pix_fmt yuv420p public/<slug>-clip1.mp4
```

One clip per sentence in the first ~15 seconds. No colour grade unless the user asks: a strong grade on dark footage makes colour fringes visible.

Then write the storyboard for the paper part: for each block, the headline words and the one object on screen. Show it to the user before writing code.

**4. Visuals.** Copy `src/Example.tsx` to `src/<Slug>.tsx` and register it in `src/index.tsx`. The structure stays the same: `Footage` with `Clip`s and `Captions`, then one `Scene` per block with a `StairText` headline and one object.

**5. Sound.** `<Snd name="pop" at={frame}>` plays a recorded sound from `public/sfx`. One sound per thing that moves, volume 0.25-0.5, almost nothing over the footage. Music: the user gives the track, the start second and the volume; play it with `<Audio>` at 0.08-0.12 under the voice.

**6. Check, then render.**

```bash
npx tsc --noEmit
npx remotion render src/index.tsx <Id> out/check.mp4 --scale 0.5
# stills with the safe area drawn on top (box is halved because of --scale 0.5)
ffmpeg -ss <t> -i out/check.mp4 -frames:v 1 -vf "drawbox=x=55:y=65:w=430:h=685:color=red:t=2" out/check-<t>.png
```

Look at one still per scene. Fix anything that crosses the box or leaves half the frame empty. Final render, only after the user says so:

```bash
npx remotion render src/index.tsx <Id> out/<slug>.mp4 --codec h264 --crf 14
```

## Hard rules

1. **Safe area.** Everything that must be read stays in x 110-970, y 130-1500 (`SAFE` in the kit). The rest is covered by the app.
2. **Fill the box.** Headline from y≈150, one big object from y≈550 to y≈1450. No small blocks floating in the middle.
3. **Measure the accent word.** The gold italic word is 1.85× the headline size and about 0.36em per character: `chars × 0.36 × size × 1.85` must stay under 860. If it does not fit, shrink the headline or pick a shorter accent.
4. **Every cue is a word of the voice.** `const at = makeCues(words, 30)`, then `at("script")`, `at("the", 1)` for the second occurrence. Never type a frame number for something that follows the voice. Do not cue on a word Whisper is likely to misspell.
5. **Captions cover every word.** In `PHRASES`, the counts must add up to the words spoken over the footage, in order. One accent line per phrase.
6. **No invented numbers on screen.** Mock interface text stays generic. A real statistic shows its source.
7. **One idea per scene.** When the next block starts, the previous objects leave (`Scene`, `Out`).

## The kit

`Paper` background and grid · `Scene` lifetime and exit · `StairText` headline · `Out` fade a block out · `Footage`, `Clip`, `Captions` the live part · `Card` dark window · `PixelChip` sticker · `You`, `Agent` mascots · `Snd` sound · `makeCues` voice cues · `SAFE`, `GOLD`, `INK`, `CARD`, `PAPER` constants.

Draw anything else the script needs (a clock, a ring, a page, a chart) as plain React and CSS inside a `Scene`, with the same colours and `LONG_SHADOW`. The look belongs to the user: palette and fonts are a few constants at the top of `kit.tsx`.

## What not to do

- Do not open with the paper animation. The first frame is the user.
- Do not write captions by hand with frame numbers. Build them from `words.json`.
- Do not add a sound to every word.
- Do not call the reel finished on your own. Motion and audio are judged by the user.
