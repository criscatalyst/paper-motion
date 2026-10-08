import React from "react";
import { Composition, registerRoot } from "remotion";
import { EXAMPLE_FRAMES, Example } from "./Example";

// One <Composition> per reel. Add yours under the example:
//   npx remotion studio src/index.tsx
registerRoot(() => (
  <>
    <Composition id="Example" component={Example} width={1080} height={1920} fps={30} durationInFrames={EXAMPLE_FRAMES} />
  </>
));
