import React from "react";
import {
  AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/EBGaramond";
import { loadFont as loadAccent } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadPixel } from "@remotion/google-fonts/PressStart2P";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

// Paper Motion kit: the shared pieces of the format. Footage of you with a
// caption on every word, then a slide down to a paper animation: notebook grid,
// stair-stepped serif words, dark cards on long soft shadows, mascot agents.
// Frames are always absolute composition frames.

// Fonts (all open licence, loaded from Google Fonts; the render waits for them).
export const SERIF = loadSerif("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
export const ACCENT = loadAccent("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const PIXEL = loadPixel("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const PAPER = "#C8C5BF";
export const INK = "#111111";
export const GOLD = "#E8A317";
export const CARD = "#0E1117";
export const LONG_SHADOW = "28px 44px 60px rgba(30,25,15,0.30), 8px 12px 16px rgba(30,25,15,0.22)";
export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// Safe area of a full-screen reel, in composition pixels (1080x1920). The top
// and the sides are covered by the app chrome; the bottom 420px belong to the
// caption, the username and the audio row. Nothing that has to be read goes
// outside x 110–970, y 130–1500. Fill that box.
export const SAFE = { left: 110, right: 970, top: 130, bottom: 1500 } as const;

export const usePop = (at: number, damping = 11) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 150, mass: 0.7 } });
};

// ── Voice cues ──────────────────────────────────────────────────────────────
export type VoiceWord = { word: string; start: number; end: number };

// Cue lookup on the voiceover's words.json: at("script") is the frame the word
// starts on, at("the", 1) its second occurrence. Visuals cued this way follow
// the voice when it is regenerated. A missing word stops the render on purpose.
export const makeCues = (words: VoiceWord[], fps: number) => {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
  return (word: string, nth = 0): number => {
    const hits = words.filter((w) => clean(w.word) === clean(word));
    if (!hits[nth]) throw new Error(`cue "${word}" #${nth} not found in the voiceover`);
    return Math.round(hits[nth].start * fps);
  };
};

// ── Paper ───────────────────────────────────────────────────────────────────
// Paper background + slowly drifting notebook grid.
export const Paper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 70% at 50% 42%, #D8D5CF 0%, ${PAPER} 75%)` }}>
      <AbsoluteFill style={{
        backgroundImage:
          "linear-gradient(rgba(40,55,80,0.17) 2px, transparent 2px), linear-gradient(90deg, rgba(40,55,80,0.17) 2px, transparent 2px)",
        backgroundSize: "96px 96px",
        backgroundPosition: `${-frame * 0.35}px ${-frame * 0.5}px`,
        maskImage: "radial-gradient(ellipse 85% 75% at 50% 45%, #000 35%, transparent 95%)",
      }} />
      {children}
    </AbsoluteFill>
  );
};

// Scene wrapper: slow push-in while alive, then a scale + blur whip on exit.
export const Scene: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to + 12) return null;
  const out = interpolate(frame, [to, to + 12], [0, 1], { ...CLAMP, easing: Easing.in(Easing.cubic) });
  const push = interpolate(frame, [from, to], [1, 1.045], CLAMP);
  return (
    <AbsoluteFill style={{
      opacity: 1 - out,
      transform: `scale(${push + out * 0.5})`,
      filter: out > 0 ? `blur(${out * 22}px)` : undefined,
    }}>{children}</AbsoluteFill>
  );
};

// Fades its children out (rise + blur) from `at`, then unmounts them.
export const Out: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 8], [0, 1], CLAMP);
  if (p >= 1) return null;
  return (
    <AbsoluteFill style={{ opacity: 1 - p, transform: `translateY(${-p * 30}px)`, filter: p > 0 ? `blur(${p * 14}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

// ── Stair text ──────────────────────────────────────────────────────────────
export type W = { t: string; at: number; accent?: boolean; flicker?: boolean };
// `flicker`: the word blinks on and off for half a second before it settles (frames from `at`).
const FLICKER = [1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1];

// Words land one by one (rise + de-blur); each line steps further right and
// tucks under the one above, the accent word goes big, italic and gold.
// `ink` / `accent` / `shadow` restyle it for use over footage (white + bright gold + drop shadow).
// Before placing an accent word, measure it: chars × 0.36 × (size × 1.85) must fit in 860px.
export const StairText: React.FC<{
  top: number; size?: number; lines: { left: number; words: W[] }[]; ink?: string; accent?: string; shadow?: string;
}> = ({ top, size = 104, lines, ink = INK, accent = GOLD, shadow }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0 }}>
      {lines.map((line, li) => (
        <div key={li} style={{ marginLeft: line.left, marginTop: li === 0 ? 0 : -size * 0.06, display: "flex", alignItems: "baseline", gap: size * 0.2 }}>
          {line.words.map((w, wi) => {
            const p = interpolate(frame, [w.at, w.at + 7], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
            const f = frame - w.at;
            const blinking = w.flicker && f >= 0 && f < FLICKER.length;
            return (
              <span key={wi} style={{
                opacity: blinking ? FLICKER[f] : p,
                transform: `translateY(${(1 - p) * 34}px) scale(${0.94 + p * 0.06})`,
                filter: p < 1 ? `blur(${(1 - p) * 12}px)` : undefined,
                fontFamily: w.accent ? ACCENT : SERIF,
                fontStyle: w.accent ? "italic" : "normal",
                fontWeight: w.accent ? 400 : 500,
                fontSize: w.accent ? size * 1.85 : size,
                lineHeight: 0.9,
                letterSpacing: w.accent ? -4 : -3,
                color: w.accent ? accent : ink,
                textShadow: shadow,
                whiteSpace: "nowrap",
              }}>{w.t}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ── Footage ─────────────────────────────────────────────────────────────────
// One shot of you. Slow push-in for the whole shot; children are drawn inside
// the zoom, so an overlay stays glued to the footage. `src` is a file in public/;
// with `src={null}` it shows a placeholder, so the template runs before you add a clip.
export const Clip: React.FC<{ src: string | null; from: number; to: number; origin?: string; children?: React.ReactNode }> = ({ src, from, to, origin = "50% 40%", children }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const zoom = interpolate(frame, [from, to], [1, 1.12], CLAMP);
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: origin }}>
      {src ? (
        <Sequence from={from} durationInFrames={to - from} layout="none">
          <OffthreadVideo muted src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
      ) : (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 35%, #3A3F4B 0%, #14161C 70%)", alignItems: "center" }}>
          <div style={{ marginTop: 520, fontFamily: PIXEL, fontSize: 30, color: "#8A8F9C", letterSpacing: 2 }}>YOUR CLIP HERE</div>
        </AbsoluteFill>
      )}
      {children}
    </AbsoluteFill>
  );
};

export const SLIDE_FRAMES = 16;

// The live part of the reel. It covers the paper until `until`, then slides
// down in 16 frames and uncovers it. Put the <Clip>s inside, then <Captions>.
export const Footage: React.FC<{ until: number; children: React.ReactNode }> = ({ until, children }) => {
  const frame = useCurrentFrame();
  const end = until + SLIDE_FRAMES;
  if (frame >= end) return null;
  const slide = interpolate(frame, [until, end], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{
      transform: `translateY(${slide * 1920}px)`, overflow: "hidden", backgroundColor: "#000",
      boxShadow: slide > 0 ? "0 -30px 80px rgba(0,0,0,0.45)" : undefined,
    }}>{children}</AbsoluteFill>
  );
};

// Captions over footage: every word of the voice, phrase by phrase. A phrase is
// a list of lines; a line is a list of [text, how many voiceover words it covers].
// A line starting with "*" is the accent line, "~" makes the word flicker in.
// The counts must add up to the words spoken over the footage, in order.
export type Phrase = [string, number][][];
export const Captions: React.FC<{ phrases: Phrase[]; words: VoiceWord[]; end: number }> = ({ phrases, words, end }) => {
  const { fps } = useVideoConfig();
  let w = 0;
  const built = phrases.map((phrase) => phrase.map((line, li) => {
    const accent = line[0][0].startsWith("*");
    const long = line[0][0].length > 10;
    return {
      left: accent ? (long ? 125 : 200) : [150, 290, 220][li % 3],
      // the very first words are already on screen at frame 0 (at: -8)
      words: line.map(([t, n]) => {
        const word = { t: t.replace(/[*~]/g, ""), at: w === 0 ? -8 : Math.round(words[w].start * fps), accent, flicker: t.includes("~") };
        w += n;
        return word;
      }),
    };
  }));
  return (
    <>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 42%, rgba(0,0,0,0.68) 74%)" }} />
      {built.map((lines, i) => (
        <Out key={i} at={i + 1 < built.length ? built[i + 1][0].words[0].at - 3 : end}>
          <StairText top={lines.length === 3 ? 1000 : 1080} size={104} lines={lines}
            ink="#FFFFFF" accent="#FFD93D" shadow="0 4px 26px rgba(0,0,0,0.75)" />
        </Out>
      ))}
    </>
  );
};

// ── Objects ─────────────────────────────────────────────────────────────────
export const Eyes: React.FC<{ size: number; color: string; seed?: number }> = ({ size, color, seed = 0 }) => {
  const frame = useCurrentFrame();
  const blink = (frame + seed * 17) % 70 < 3 ? 0.15 : 1;
  const eye: React.CSSProperties = {
    position: "absolute", top: "40%", width: size * 0.13, height: size * 0.13,
    backgroundColor: color, transform: `scaleY(${blink})`,
  };
  return <><div style={{ ...eye, left: "30%" }} /><div style={{ ...eye, left: "57%" }} /></>;
};

// "You": the one gold chip. Agents: dark glossy discs with gold pixel eyes.
export const You: React.FC<{ size: number }> = ({ size }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.26, position: "relative",
    background: "linear-gradient(145deg, #F6C24C 0%, #E8A317 55%, #C7870A 100%)",
    boxShadow: `${LONG_SHADOW}, inset 0 6px 0 rgba(255,255,255,0.35), inset 0 -8px 0 rgba(0,0,0,0.12)`,
  }}><Eyes size={size} color={INK} /></div>
);

export const Agent: React.FC<{ size: number; seed: number }> = ({ size, seed }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", position: "relative",
    background: `radial-gradient(circle at 32% 26%, #4A4E59 0%, ${CARD} 58%)`,
    boxShadow: LONG_SHADOW,
  }}><Eyes size={size} color={GOLD} seed={seed} /></div>
);

// Dark card that pops in at `at` and keeps floating with a slow tilt.
export const Card: React.FC<{
  at: number; left: number; top: number; width: number; height: number; tilt?: number;
  style?: React.CSSProperties; children?: React.ReactNode;
}> = ({ at, left, top, width, height, tilt = -2, style, children }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 14);
  const drift = Math.sin(frame * 0.05) * 1.1;
  return (
    <div style={{
      position: "absolute", left, top, width, height, boxSizing: "border-box",
      transform: `translateY(${(1 - p) * 240}px) scale(${0.7 + p * 0.3}) rotate(${tilt * (2 - p) + drift}deg)`,
      opacity: Math.min(1, p * 2),
      backgroundColor: CARD, borderRadius: 36, boxShadow: LONG_SHADOW,
      fontFamily: MONO, color: "#E6E6E6", fontSize: 32, padding: "30px 40px",
      ...style,
    }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 30 }}>
        {[0, 1, 2].map((d) => <div key={d} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#E6E6E6" }} />)}
      </div>
      {children}
    </div>
  );
};

// Small pixel-font label, the format's "sticker".
export const PixelChip: React.FC<{ at: number; left: number; top: number; rotate?: number; invert?: boolean; size?: number; children: React.ReactNode }> = ({ at, left, top, rotate = -4, invert, size = 26, children }) => {
  const p = usePop(at);
  return (
    <div style={{
      position: "absolute", left, top, transform: `scale(${p}) rotate(${rotate}deg)`,
      backgroundColor: invert ? GOLD : CARD, color: invert ? INK : GOLD,
      fontFamily: PIXEL, fontSize: size, letterSpacing: 2,
      padding: `${size * 0.6}px ${size * 0.8}px`, borderRadius: 14, boxShadow: LONG_SHADOW, whiteSpace: "nowrap",
    }}>{children}</div>
  );
};

// ── Sound ───────────────────────────────────────────────────────────────────
// Recorded sounds in public/sfx (Kenney "Interface Sounds", CC0). `peak` = frames
// from the start of the file to its loudest point: the sound starts that much
// earlier, so the hit lands on the frame you ask for. Add your own files here.
export const SOUNDS = {
  click: { file: "click_002.ogg", peak: 0 },
  tick: { file: "tick_001.ogg", peak: 0 },
  pop: { file: "drop_002.ogg", peak: 0 },
  confirm: { file: "confirmation_001.ogg", peak: 0 },
  whoosh: { file: "maximize_008.ogg", peak: 5 },
} as const;
export type SoundName = keyof typeof SOUNDS;

export const Snd: React.FC<{ name: SoundName; at: number; vol?: number; dur?: number }> = ({ name, at, vol = 0.3, dur = 45 }) => (
  <Sequence from={Math.max(0, Math.round(at - SOUNDS[name].peak))} durationInFrames={dur}>
    <Audio src={staticFile(`sfx/${SOUNDS[name].file}`)} volume={vol} />
  </Sequence>
);
