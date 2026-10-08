#!/usr/bin/env python3
"""Voiceover -> words.json: one {word, start, end} per spoken word, in seconds.

    python3 scripts/words.py voice.wav template/src/my-reel.words.json
    python3 scripts/words.py voice.wav out.json --model small --language en

Needs the `whisper` command (pip install openai-whisper) and ffmpeg.
Run it on the exact audio file the reel plays: if you speed the voice up
afterwards, the timings no longer match.
"""
import argparse
import json
import pathlib
import subprocess
import sys
import tempfile


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("audio")
    ap.add_argument("out")
    ap.add_argument("--model", default="small")
    ap.add_argument("--language", default="en")
    args = ap.parse_args()

    audio = pathlib.Path(args.audio)
    if not audio.is_file():
        print(f"not found: {audio}", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ["whisper", str(audio), "--model", args.model, "--language", args.language,
             "--word_timestamps", "True", "--output_format", "json", "--output_dir", tmp],
            check=True, stdout=subprocess.DEVNULL,
        )
        data = json.loads((pathlib.Path(tmp) / f"{audio.stem}.json").read_text())

    words = [
        {"word": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
        for seg in data["segments"] for w in seg.get("words", [])
    ]
    if not words:
        print("no words found: is there speech in the file?", file=sys.stderr)
        return 1

    pathlib.Path(args.out).write_text(json.dumps(words, indent=1) + "\n")
    print(f"{len(words)} words, {words[-1]['end']:.1f}s -> {args.out}")
    print(" ".join(w["word"] for w in words))
    print("Read the line above against your script: Whisper misspells names, and a cue on a misspelled word will not be found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
