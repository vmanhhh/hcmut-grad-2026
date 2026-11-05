# Journey ↔ Card Contract (client-side)

This is the boundary between the React shell (`components/journey/JourneyHost.tsx`) and the Phaser game (`game/`). The game never fetches data and never calls the API. It receives everything it needs and reports back through callbacks.

## Start

```ts
type JourneyInput = {
  letter: { salutation: string; title: string; body: string }; // this guest's message (FR-017)
  memories: Memory[];                                           // from content/memories.json
  hostName: string;
  muted: boolean;                                               // from localStorage
  mode: "play" | "replay";
};

type JourneyCallbacks = {
  onZone(zone: "gate" | "hallway" | "project" | "stage" | "diploma" | "letter"): void;
  onMuteChange(muted: boolean): void;
  onFinish(reason: "completed" | "skipped"): void;              // always leads to the card
};

type JourneyHandle = {
  setMuted(muted: boolean): void;   // driven by the host-owned Mute button
  skipCutscene(): void;             // driven by the host-owned Skip button; no-op outside cutscenes
  destroy(): void;
};

function startJourney(parent: HTMLElement, input: JourneyInput, cb: JourneyCallbacks): JourneyHandle;
```

## Rules

- `onFinish` is called exactly once per run. The host then destroys the game, removes the overlay, shows the card, and calls `POST /open` if this was the first visit (FR-012).
- The "Vào thiệp mời" (skip the journey), Skip-cutscene and Mute controls are **HTML elements owned by the host**, not drawn by Phaser. That way they work before Phaser loads and if it fails (Principle I).
- If the Phaser chunk or its assets fail to load, or take more than 8 seconds, the host calls `onFinish("skipped")` itself and shows the card.
- Under `prefers-reduced-motion`, or when `navigator.hardwareConcurrency <= 2` or `deviceMemory <= 2`, the host renders `ChaptersFallback` (stacked chapters with the same memories and letter) instead of starting Phaser (FR-018).
- The game must have no fail states, no lives, and no jumps that are required to progress (FR-015).
- Controls:
  - Keyboard: `A`/`D` or `←`/`→` to move, `E`/`Space` to interact.
  - Pointer: tap or click a glowing frame to interact. Touch: on-screen ◀ ▶ buttons, plus tap-to-walk toward the tapped x position.
