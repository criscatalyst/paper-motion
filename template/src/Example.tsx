import React from "react";
import { Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  Agent, CLAMP, Captions, Card, Clip, Footage, GOLD, MONO, Paper, PixelChip, Scene, Snd, StairText, You,
  makeCues, usePop, type Phrase, type VoiceWord,
} from "./kit";
import WORDS from "./example.words.json";

// Paper Motion · example reel, 10 seconds. Copy this file for a new reel.
// Structure: footage of you with a caption on every word, a slide down, then
// the paper animation. Every cue is a word of the voiceover (at("word")), so
// the visuals follow the voice if you regenerate it.
// Layout: everything stays inside the safe area (SAFE in kit.tsx) and fills
// it: headline from y≈150, one big object from y≈550 to y≈1450.
export const EXAMPLE_FRAMES = 300;
const words = WORDS as VoiceWord[];
const at = makeCues(words, 30);

// Your material, as file names in public/. With null the example still runs:
// a placeholder instead of the clip, and no sound.
const CLIP: string | null = null;    // e.g. "clip.mp4" (1080x1920, see README)
const VOICE: string | null = null;   // e.g. "voice.wav" (the audio words.json was made from)

const S2 = at("every") - 6;    // "Every word lands…": the footage slides down
const S3 = at("that's") - 6;   // "That's the whole machine."
const S4 = at("now") - 6;      // "Now make yours."

const PHRASES: Phrase[] = [
  [[["You write the", 3]], [["*script.", 1]]],
  [[["A voice", 2], ["reads it", 2]], [["*out loud.", 2]]],
];

// The voice as a strip of bars; a gold marker drops on the start of every word.
const Waveform: React.FC = () => {
  const frame = useCurrentFrame();
  const total = words[words.length - 1].end;
  return (
    <div style={{ position: "relative", height: 300, marginTop: 20 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", alignItems: "center", gap: 5, height: 150 }}>
        {Array.from({ length: 60 }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 22 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 120, backgroundColor: "#4A4E59", borderRadius: 4 }} />
        ))}
      </div>
      {words.map((w, i) => {
        const cue = Math.round(w.start * 30);
        const p = interpolate(frame, [cue - 4, cue], [0, 1], CLAMP);
        return (
          <div key={i} style={{
            position: "absolute", left: `${(w.start / total) * 100}%`, top: -60 + p * 60, width: 8, height: 300,
            backgroundColor: GOLD, borderRadius: 4, opacity: p,
          }} />
        );
      })}
    </div>
  );
};

const Machine: React.FC = () => {
  const frame = useCurrentFrame();
  const steps = [
    { label: "SCRIPT", cue: at("that's") },
    { label: "VOICE", cue: at("whole") },
    { label: "CODE", cue: at("machine") },
  ];
  const you = usePop(at("that's") + 4);
  return (
    <>
      {steps.map((s, i) => (
        <PixelChip key={s.label} at={s.cue} left={140 + i * 130} top={740 + i * 215} rotate={i % 2 ? 3 : -4} size={56} invert={i === 2}>{s.label}</PixelChip>
      ))}
      <div style={{ position: "absolute", left: 700, top: 720 + Math.sin(frame * 0.1) * 8, transform: `scale(${you})` }}><You size={230} /></div>
    </>
  );
};

export const Example: React.FC = () => {
  const agent = usePop(at("lands"));
  return (
    <Paper>
      {VOICE && <Audio src={staticFile(VOICE)} />}
      <Snd name="whoosh" at={S2 + 8} vol={0.3} />
      <Snd name="tick" at={at("cue")} vol={0.35} />
      <Snd name="pop" at={at("that's")} vol={0.3} />
      <Snd name="pop" at={at("whole")} vol={0.3} />
      <Snd name="confirm" at={at("machine")} vol={0.3} />

      <Scene from={S2} to={S3}>
        <StairText top={160} size={104} lines={[
          { left: 150, words: [{ t: "Every", at: at("every") }, { t: "word", at: at("word") }] },
          { left: 290, words: [{ t: "lands on", at: at("lands") }] },
          { left: 200, words: [{ t: "its cue.", at: at("cue"), accent: true }] },
        ]} />
        <Card at={S2 + 10} left={130} top={760} width={820} height={600}>
          <div style={{ fontFamily: MONO, fontSize: 34, color: "#8A8F9C" }}>voice.wav → words.json</div>
          <Waveform />
        </Card>
        <div style={{ position: "absolute", left: 780, top: 1290, transform: `scale(${agent})` }}><Agent size={170} seed={1} /></div>
      </Scene>

      <Scene from={S3} to={S4}>
        <StairText top={160} size={104} lines={[
          { left: 150, words: [{ t: "That's the", at: at("that's") }] },
          { left: 290, words: [{ t: "whole", at: at("whole") }] },
          { left: 200, words: [{ t: "machine.", at: at("machine"), accent: true }] },
        ]} />
        <Machine />
      </Scene>

      <Scene from={S4} to={EXAMPLE_FRAMES}>
        <StairText top={160} size={120} lines={[
          { left: 150, words: [{ t: "Now", at: at("now") }, { t: "make", at: at("make") }] },
          { left: 280, words: [{ t: "yours.", at: at("yours"), accent: true }] },
        ]} />
        <PixelChip at={at("yours") + 6} left={180} top={840} rotate={-5} size={62} invert>YOUR TURN</PixelChip>
        <div style={{ position: "absolute", left: 390, top: 1090 }}><You size={300} /></div>
      </Scene>

      {/* Drawn last, so the footage sits on top of the paper until it slides away. */}
      <Footage until={S2}>
        <Clip src={CLIP} from={0} to={at("a") - 2} origin="50% 40%" />
        <Clip src={CLIP} from={at("a") - 2} to={S2 + 16} origin="60% 42%" />
        <Captions phrases={PHRASES} words={words} end={S2 + 16} />
      </Footage>
    </Paper>
  );
};
