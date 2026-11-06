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
  onGallery(year: number, done: () => void): void;              // host shows crisp HTML gallery
  onMemory(memory: Memory, done: () => void): void;             // host shows crisp HTML memory card
  onFeatured(preview: FeaturedPreview | null): void;            // bottom caption strip (null = walk away)
  onLetter(done: () => void): void;                             // host shows crisp HTML letter (not pixel canvas)
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
- The game must have no fail states, no lives, no jumps and no blockers: the path is one-way and linear, with no free roam (FR-015).
- Controls:
  - Keyboard: `W` `A` `S` `D` or the arrow keys walk in four directions (the most recently pressed direction wins; keys held across a scene change keep working); `E`/`Space` interact. While a memory popup is open `E`, `Space`, `Enter` and `Esc` all close it.
  - Pointer: tap or click a glowing frame to interact (it walks there first when out of range).
  - Touch: an on-screen D-pad (four buttons, at least 44 CSS px each) and an on-screen `E` button that appears when something can be interacted with; plus tap-to-walk toward the tapped point along the path. The D-pad hides in cutscenes and while a popup is open, so the popup never overlaps controls.
- Rendering: `pixelArt: true`, integer CSS zoom; the internal resolution follows the container (about 420 px wide on landscape, about 280 px wide on portrait phones). Phaser HUD text is rendered at `resolution = zoom`. Captions, memory photos, gallery, and the personal letter are host-owned HTML (`onFeatured` / `onMemory` / `onGallery` / `onLetter`) so they stay sharp and readable on phones — not drawn into the pixel canvas. Zone events: `gate` (Campus), `hallway` and `project` (Hallway), `stage` (Stage lobby), `diploma` (cutscene), `letter`.
- Debug only: setting `localStorage["journey-debug"] = "1"` exposes the Phaser game as `window.__journey` for screenshot scripts.
