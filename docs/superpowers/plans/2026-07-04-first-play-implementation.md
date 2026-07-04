# First-Play Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mode-selection home screen with an immediately playable, three-question onboarding that flows into the existing timed game, while simplifying feedback, hints, and post-game navigation.

**Architecture:** Keep `App` as the state coordinator, but isolate onboarding content and rendering in focused modules. Reuse the existing `GameState` and timed-game pipeline, adding explicit onboarding state and a single-use hint flag; persist only onboarding completion and first-answer latency in schema-2 player data. Preserve the existing mode implementations internally while removing them from first-level navigation.

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, Vitest 3, Testing Library, Chrome Extension local storage.

**Design reference:** `docs/superpowers/specs/2026-07-04-first-play-design.md`

---

## File map

**Create**

- `src/features/onboarding/firstPlay.ts` — curated three-question sequence, fallback selection, and onboarding-state helpers.
- `src/features/onboarding/FirstPlayScreen.tsx` — first-question surface with no mode, score, profile, or settings chrome.
- `src/test/playerStorage.test.ts` — schema migration and persistence defaults.
- `src/test/firstPlay.test.ts` — curated sequence and onboarding transition tests.
- `src/test/firstPlayScreen.test.tsx` — first-screen interaction and accessibility tests.
- `src/test/gameScreen.test.tsx` — feedback retry, one-use hint, guided third question, and delayed-stat tests.
- `src/test/resultScreen.test.tsx` — post-game action hierarchy tests.

**Modify**

- `src/features/game/types.ts` — schema-2 player fields, boolean hint state, and onboarding metadata on game state.
- `src/features/profile/playerStorage.ts` — explicit schema-1 migration and first-play metric persistence.
- `src/features/game/game.ts` — onboarding-aware timed game creation and per-question reset.
- `src/features/game/scoring.ts` — replace graduated hint penalty with speed-bonus cancellation.
- `src/features/game/GameScreen.tsx` — immediate retry, 700 ms correct feedback, delayed stats, one-use hint, and third-question locked tile.
- `src/features/results/ResultScreen.tsx` — one primary replay action plus daily, share, and profile secondary actions.
- `src/app/App.tsx` — hydrate before rendering, choose first-play/regular entry, record latency, and route result actions.
- `src/styles/app.css` — first-play layout, answer states, reduced-motion behavior, and result hierarchy.
- `vite.config.ts` — include `.test.tsx` component tests.
- `src/test/domain.test.ts` — update score and hint expectations.

**Retain but remove from first-level navigation**

- `src/features/home/HomeScreen.tsx`
- `src/features/profile/ProfileScreen.tsx`
- `level` and `endless` mode logic

---

### Task 1: Add schema-2 player migration

**Files:**

- Modify: `src/features/game/types.ts:28-39`
- Modify: `src/features/profile/playerStorage.ts:5-44`
- Create: `src/test/playerStorage.test.ts`

- [ ] **Step 1: Write failing migration tests**

Test new, inactive schema-1, and played schema-1 profiles separately:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, loadProfile } from "../features/profile/playerStorage";

describe("player profile migration", () => {
  beforeEach(() => localStorage.clear());

  it("starts a new profile in onboarding", async () => {
    expect(await loadProfile()).toMatchObject({
      schemaVersion: 2,
      onboardingCompleted: false,
    });
  });

  it("keeps an unused schema-1 profile in onboarding", async () => {
    localStorage.setItem("emoji-guess-profile", JSON.stringify({
      ...DEFAULT_PROFILE,
      schemaVersion: 1,
      onboardingCompleted: undefined,
    }));
    expect((await loadProfile()).onboardingCompleted).toBe(false);
  });

  it("skips onboarding for a schema-1 player with history", async () => {
    localStorage.setItem("emoji-guess-profile", JSON.stringify({
      ...DEFAULT_PROFILE,
      schemaVersion: 1,
      xp: 20,
      onboardingCompleted: undefined,
    }));
    expect(await loadProfile()).toMatchObject({
      schemaVersion: 2,
      onboardingCompleted: true,
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/test/playerStorage.test.ts`

Expected: FAIL because `schemaVersion` is still `1` and onboarding fields do not exist.

- [ ] **Step 3: Define schema-2 fields**

Change `PlayerProfile` to:

```ts
export interface PlayerProfile {
  schemaVersion: 2;
  onboardingCompleted: boolean;
  firstAnswerLatencyMs?: number;
  // retain all existing fields unchanged
}
```

- [ ] **Step 4: Implement explicit migration**

Add a pure helper and use it from `loadProfile`:

```ts
function hasPlayed(value: Partial<PlayerProfile>): boolean {
  return Boolean(
    (value.xp ?? 0) > 0 ||
    value.lastPlayedDate ||
    Object.values(value.bestScores ?? {}).some((score) => (score ?? 0) > 0),
  );
}

export function migrateProfile(raw: unknown): PlayerProfile {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_PROFILE);
  const value = raw as Partial<PlayerProfile> & { schemaVersion?: number };
  return {
    ...structuredClone(DEFAULT_PROFILE),
    ...value,
    schemaVersion: 2,
    onboardingCompleted:
      value.schemaVersion === 2
        ? Boolean(value.onboardingCompleted)
        : hasPlayed(value),
    bestScores: { ...emptyScores, ...value.bestScores },
    dailyResults: value.dailyResults ?? {},
    recentQuestionIds: Array.isArray(value.recentQuestionIds) ? value.recentQuestionIds : [],
  };
}
```

Set `DEFAULT_PROFILE.schemaVersion` to `2` and `onboardingCompleted` to `false`.

- [ ] **Step 5: Run focused and full domain tests**

Run: `npm test -- src/test/playerStorage.test.ts src/test/domain.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/game/types.ts src/features/profile/playerStorage.ts src/test/playerStorage.test.ts
git commit -m "feat: migrate player profiles for onboarding"
```

---

### Task 2: Create a deterministic first-play sequence

**Files:**

- Create: `src/features/onboarding/firstPlay.ts`
- Create: `src/test/firstPlay.test.ts`
- Modify: `src/features/game/types.ts:41-58`
- Modify: `src/features/game/game.ts:26-33`

- [ ] **Step 1: Write failing sequence tests**

```ts
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../content/questions";
import { buildFirstPlayQuestions } from "../features/onboarding/firstPlay";

describe("first-play sequence", () => {
  it("returns a stable easy/easy/spelling sequence", () => {
    const result = buildFirstPlayQuestions(QUESTIONS);
    expect(result).toHaveLength(3);
    expect(result.map((question) => question.id)).toEqual(
      buildFirstPlayQuestions(QUESTIONS).map((question) => question.id),
    );
    expect(result.slice(0, 2).every((question) =>
      question.difficulty === 1 && [...question.answer].length === 2
    )).toBe(true);
    expect(result[2].difficulty).toBeGreaterThan(1);
  });

  it("uses embedded safe questions when the main bank is unavailable", () => {
    expect(buildFirstPlayQuestions([]).map((question) => question.answer)).toEqual([
      "摸鱼", "吃瓜", "破防",
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/test/firstPlay.test.ts`

Expected: FAIL because the onboarding module does not exist.

- [ ] **Step 3: Implement curated IDs and validated fallback**

Use the verified, unambiguous questions “摸鱼”, “吃瓜”, and “破防”. Store their IDs and complete fallback objects so unavailable bank content cannot produce an empty first screen:

```ts
const FIRST_PLAY_IDS = ["q-052", "q-054", "q-053"] as const;
const FIRST_PLAY_FALLBACKS: [Question, Question, Question] = [
  {
    id: "onboarding-1", emoji: "✋🐟", answer: "摸鱼", aliases: [],
    hints: ["2 个字 · 热词", "摸", "摸_"], category: "热词",
    difficulty: 1, baseScore: 100, explanation: "上班时偷偷做别的事，像在水里摸鱼。",
  },
  {
    id: "onboarding-2", emoji: "🍉👀", answer: "吃瓜", aliases: [],
    hints: ["2 个字 · 热词", "吃", "吃_"], category: "热词",
    difficulty: 1, baseScore: 100, explanation: "拿着瓜围观，指关注别人的热闹。",
  },
  {
    id: "onboarding-3", emoji: "😭🛡️💥", answer: "破防", aliases: [],
    hints: ["2 个字 · 热词", "破", "破_"], category: "热词",
    difficulty: 2, baseScore: 100, explanation: "心理防线被击破，情绪一下绷不住。",
  },
];

export function buildFirstPlayQuestions(all: Question[]): Question[] {
  const byId = new Map(all.map((question) => [question.id, question]));
  return FIRST_PLAY_IDS.map((id, index) =>
    byId.get(id) ?? structuredClone(FIRST_PLAY_FALLBACKS[index])
  );
}
```

Add an exact mapping assertion to `firstPlay.test.ts`; it is the authoritative guard:

```ts
expect(result.map(({ id, answer, difficulty }) => [id, answer, difficulty])).toEqual([
  ["q-052", "摸鱼", 1],
  ["q-054", "吃瓜", 1],
  ["q-053", "破防", 2],
]);
```

- [ ] **Step 4: Add onboarding game metadata**

Extend `GameState`:

```ts
onboarding: boolean;
statsVisibleFromIndex: number;
hintUsed: boolean;
```

Add an optional configuration argument to `createGame`:

```ts
export function createGame(
  mode: GameMode,
  questions: Question[],
  now = Date.now(),
  options: { onboarding?: boolean } = {},
): GameState
```

For onboarding, set `statsVisibleFromIndex: 3`; otherwise set it to `0`. Set `hintUsed: false`.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- src/test/firstPlay.test.ts src/test/domain.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/onboarding/firstPlay.ts src/features/game/types.ts src/features/game/game.ts src/test/firstPlay.test.ts
git commit -m "feat: define deterministic first-play sequence"
```

---

### Task 3: Simplify hint and scoring domain rules

**Files:**

- Modify: `src/features/game/scoring.ts`
- Modify: `src/features/game/game.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/test/domain.test.ts`

- [ ] **Step 1: Replace graduated-penalty tests with boolean-hint tests**

```ts
it("removes only the speed bonus after using a hint", () => {
  expect(scoreAnswer(100, 4_000, 1, false)).toBe(150);
  expect(scoreAnswer(100, 4_000, 1, true)).toBe(100);
  expect(scoreAnswer(100, 9_000, 1, true)).toBe(100);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- src/test/domain.test.ts`

Expected: FAIL because `scoreAnswer` still accepts a numeric hint level and applies percentage penalties.

- [ ] **Step 3: Implement the boolean scoring rule**

```ts
export function scoreAnswer(
  baseScore: number,
  elapsedMs: number,
  combo: number,
  hintUsed: boolean,
): number {
  const speedBonus = !hintUsed && elapsedMs <= 5_000 ? 50 : 0;
  return Math.max(10, (baseScore + speedBonus) * comboMultiplier(combo));
}
```

Reset `hintUsed` to `false` whenever advancing to a new question. Retain `hintsUsed` as the aggregate result metric.

In `App.submit`, pass `game.hintUsed` instead of `game.hintLevel` to `scoreAnswer`. As a compile-safe transitional step, `App.hint` sets `hintUsed: true` while retaining the old `hintLevel` update used by the current `GameScreen`. Task 6 removes `hintLevel` completely after the one-use UI is in place.

- [ ] **Step 4: Run domain tests**

Run: `npm test -- src/test/domain.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/game/scoring.ts src/features/game/game.ts src/app/App.tsx src/test/domain.test.ts
git commit -m "refactor: simplify game hint scoring"
```

---

### Task 4: Build the playable first screen

**Files:**

- Create: `src/features/onboarding/FirstPlayScreen.tsx`
- Create: `src/test/firstPlayScreen.test.tsx`
- Modify: `vite.config.ts`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Enable TSX tests**

Change the Vitest include rule:

```ts
test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
```

- [ ] **Step 2: Write a failing component test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FirstPlayScreen } from "../features/onboarding/FirstPlayScreen";
import { QUESTIONS } from "../content/questions";

describe("FirstPlayScreen", () => {
  it("shows only a directly playable question", () => {
    const onAnswer = vi.fn();
    render(
      <FirstPlayScreen
        question={{ ...QUESTIONS[0], difficulty: 1 }}
        questions={QUESTIONS}
        onAnswer={onAnswer}
      />,
    );
    expect(screen.getByText("选出答案")).toBeTruthy();
    expect(screen.queryByText("60 秒快猜")).toBeNull();
    expect(screen.queryByText(/XP/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: QUESTIONS[0].answer }));
    expect(onAnswer).toHaveBeenCalledWith(QUESTIONS[0].answer);
  });
});
```

- [ ] **Step 3: Run the test and verify failure**

Run: `npm test -- src/test/firstPlayScreen.test.tsx`

Expected: FAIL because `FirstPlayScreen` does not exist.

- [ ] **Step 4: Implement the focused screen**

Render:

- compact brand only;
- category and two-character count;
- Emoji puzzle with `aria-label="由多个表情组成的谜题"`;
- “选出答案” heading;
- four choices generated by `createAnswerChoices`;
- no profile, mode, score, timer, progress, share, skip, or settings controls.

Track wrong selections locally so a wrong choice becomes unavailable while the other three remain actionable. Disable all choices only when `feedback?.kind === "correct"`; `App.submit` remains the authoritative duplicate-score guard.

- [ ] **Step 5: Add first-play styles**

Add `.first-play-screen`, `.first-play-brand`, and `.first-play-question` rules. Preserve:

- minimum 44 px answer height;
- visible `:focus-visible`;
- compact layout at 320 px width;
- no required animation;
- existing theme variables.

- [ ] **Step 6: Run test, typecheck, and build**

Run: `npm test -- src/test/firstPlayScreen.test.tsx && npm run typecheck && npm run build`

Expected: all commands PASS.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts src/features/onboarding/FirstPlayScreen.tsx src/test/firstPlayScreen.test.tsx src/styles/app.css
git commit -m "feat: add immediately playable first screen"
```

---

### Task 5: Wire onboarding into application flow

**Files:**

- Modify: `src/app/App.tsx`
- Modify: `src/features/game/game.ts`
- Modify: `src/features/game/types.ts`
- Modify: `src/features/profile/playerStorage.ts`
- Modify: `src/test/firstPlay.test.ts`

- [ ] **Step 1: Add failing transition tests to pure helpers**

Keep timer-heavy behavior outside the component by adding helpers in `firstPlay.ts`:

```ts
it("marks onboarding complete after advancing past question three", () => {
  expect(isOnboardingComplete({ onboarding: true, index: 2 })).toBe(false);
  expect(isOnboardingComplete({ onboarding: true, index: 3 })).toBe(true);
});

it("records only the first answer latency", () => {
  expect(recordFirstAnswerLatency(undefined, 1_000, 4_200)).toBe(3_200);
  expect(recordFirstAnswerLatency(3_200, 1_000, 9_000)).toBe(3_200);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/test/firstPlay.test.ts`

Expected: FAIL because the transition helpers do not exist.

- [ ] **Step 3: Implement helpers and app routing**

In `App`:

- render no gameplay screen until profile hydration completes;
- after hydration, construct a timed game whose first three questions are `buildFirstPlayQuestions(QUESTIONS)` followed by regular timed questions with duplicate IDs removed;
- create that game with `onboarding: true` and no deadline;
- while `game.onboarding && game.index === 0`, render `FirstPlayScreen` with `game.questions[0]`, `game.feedback`, and the shared `submit` callback;
- after the 700 ms correct-feedback window advances to index `1`, render `GameScreen`; therefore the first-screen answer is part of the same game and is counted exactly once;
- when advancing from index `2` to `3`, set `deadline` to `Date.now() + 60_000`, set `questionStartedAt` to the same timestamp, and show 60 seconds; keep the timer effect inactive while `deadline` is absent;
- record latency from first-screen mount to the first submitted answer;
- set `onboardingCompleted: true` exactly when advancing from index `2` to `3`;
- persist profile changes with `void saveProfile(profile).catch(() => undefined)` so a storage failure never rejects into or blocks the active game;
- on exit, return to a fresh directly playable question rather than `HomeScreen`.

Use a ref for the first-screen render timestamp so re-renders do not reset the metric.

- [ ] **Step 4: Remove obsolete home routing from the active path**

Do not delete `HomeScreen`. Stop rendering it as the default screen. Keep `profile` routing only as a secondary post-result action.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- src/test/firstPlay.test.ts src/test/playerStorage.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/App.tsx src/features/game/game.ts src/features/game/types.ts src/features/profile/playerStorage.ts src/features/onboarding/firstPlay.ts src/test/firstPlay.test.ts
git commit -m "feat: flow first play into timed game"
```

---

### Task 6: Speed up feedback and make hints single-use

**Files:**

- Modify: `src/app/App.tsx:77-110`
- Modify: `src/features/game/GameScreen.tsx`
- Modify: `src/styles/app.css:63-71,79-82`
- Create: `src/test/gameScreen.test.tsx`

- [ ] **Step 1: Write failing component tests**

Cover these behaviors with fake timers:

```tsx
it("keeps remaining choices enabled after a wrong choice", () => {
  renderGame({ question: choiceQuestion });
  fireEvent.click(screen.getByRole("button", { name: wrongAnswer }));
  expect((screen.getByRole("button", { name: choiceQuestion.answer }) as HTMLButtonElement).disabled).toBe(false);
});

it("uses the hint only once and removes two wrong choices", () => {
  renderGame({ question: choiceQuestion });
  fireEvent.click(screen.getByRole("button", { name: "帮我一步" }));
  expect(screen.getAllByText("已排除")).toHaveLength(2);
  expect((screen.getByRole("button", { name: "帮我一步" }) as HTMLButtonElement).disabled).toBe(true);
});

it("hides score, combo, and timer before onboarding question four", () => {
  renderGame({ onboarding: true, index: 2, statsVisibleFromIndex: 3 });
  expect(screen.queryByText("得分")).toBeNull();
  expect(screen.queryByText(/连对/)).toBeNull();
  expect(screen.queryByText(/s$/)).toBeNull();
});

it("shows one best-score goal for a returning player", () => {
  renderGame({ onboarding: false, index: 0, bestScore: 600 });
  expect(screen.getByText(/刷新最佳/)).toBeTruthy();
  expect(screen.getAllByText(/刷新最佳/)).toHaveLength(1);
});
```

Also test that onboarding question 3 starts with its first correct tile locked.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- src/test/gameScreen.test.tsx`

Expected: FAIL because wrong feedback disables all choices, one hint removes only one choice, and stats are always visible.

- [ ] **Step 3: Implement immediate wrong retry**

Change answer submission to carry the selected value or tile IDs needed for visual state. On wrong answers:

- increment attempts and reset combo;
- do not set a global blocking feedback state;
- mark only the wrong choice or current spelling attempt;
- keep remaining choice buttons enabled;
- clear unprotected spelling tiles immediately;
- use `aria-live` text such as “不对，再试一次”;
- do not schedule a 700 ms unlock timer.

For endless mode, preserve life loss and finish behavior.

- [ ] **Step 4: Shorten correct feedback**

Replace the 2,200 ms advance delay with a named constant:

```ts
export const CORRECT_FEEDBACK_MS = 700;
```

Keep correct-answer input locked during those 700 ms and prevent duplicate score updates.

- [ ] **Step 5: Implement one-use hint**

In `GameScreen.requestHint`:

- return immediately when `state.hintUsed`;
- choice mode: hide the first two deterministic wrong choices;
- spelling mode: lock exactly the next correct character;
- call `onHint` once.

Change the control label to `💡 帮我一步`; disable it after use. Remove all `/3` display and `question.hints[state.hintLevel - 1]` logic.

After the UI no longer reads it, remove `hintLevel` from `GameState`, `createGame`, `advance`, and `App.hint`; `hintUsed` becomes the only per-question hint state.

- [ ] **Step 6: Implement progressive disclosure**

Compute:

```ts
const showStats = state.index >= state.statsVisibleFromIndex;
const showCombo = showStats && state.combo >= 3;
```

Hide timer, progress, score, combo, share, and skip during onboarding questions 1–3. On question 3, initialize `selectedIds` and `lockedCount` to the first correct tile.

Add a `bestScore` prop from `App` using `profile.bestScores[state.mode]`. For non-onboarding play, show one quiet goal near the score—`再得 N 分刷新最佳` when the record is ahead, otherwise `已刷新最佳`—and do not add any second concurrent goal. This is the returning player’s subtle history cue; onboarding screens do not show it.

- [ ] **Step 7: Add visual and reduced-motion states**

Add explicit `.answer-choice--wrong`, `.answer-choice--correct`, and `.feedback-explanation` styles. Apply shake only within `@media (prefers-reduced-motion: no-preference)` and ensure `data-reduce-motion=true` disables it.

- [ ] **Step 8: Run focused tests and all automated checks**

Run:

```bash
npm test -- src/test/gameScreen.test.tsx src/test/domain.test.ts
npm run typecheck
npm run build
```

Expected: all commands PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/App.tsx src/features/game/GameScreen.tsx src/styles/app.css src/test/gameScreen.test.tsx
git commit -m "feat: streamline answer feedback and hints"
```

---

### Task 7: Reorder the result screen around replay and daily play

**Files:**

- Modify: `src/features/results/ResultScreen.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/app.css:72-74`
- Create: `src/test/resultScreen.test.tsx`

- [ ] **Step 1: Write a failing hierarchy test**

```tsx
it("has one primary replay action and exposes daily play secondarily", () => {
  render(<ResultScreen {...props} />);
  expect(screen.getAllByRole("button", { name: "再来一局" })).toHaveLength(1);
  expect(screen.getByRole("button", { name: "每日挑战" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "查看档案" })).toBeTruthy();
  expect(document.querySelectorAll(".primary-button")).toHaveLength(1);
  expect(screen.queryByText("闯关")).toBeNull();
  expect(screen.queryByText("无尽")).toBeNull();
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- src/test/resultScreen.test.tsx`

Expected: FAIL because daily and profile callbacks are not available.

- [ ] **Step 3: Add explicit secondary callbacks**

Extend props with `onDaily` and `onProfile`. Render:

- “再来一局” as the only `.primary-button`;
- “每日挑战” as a secondary button;
- “晒成绩” and “查看档案” as tertiary controls;
- result headline based primarily on correct answers or a record;
- no mode grid.

In `App`, wire `onDaily={() => start("daily")}` and `onProfile={() => setScreen("profile")}`.

- [ ] **Step 4: Update result styles**

Use one full-width primary row and a quieter secondary action row. Keep all targets at least 44 px high and preserve keyboard focus.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm test -- src/test/resultScreen.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/results/ResultScreen.tsx src/app/App.tsx src/styles/app.css src/test/resultScreen.test.tsx
git commit -m "feat: simplify post-game actions"
```

---

### Task 8: Complete end-to-end verification

**Files:**

- Potentially modify: only the already tracked implementation and test files from Tasks 1–7 when a verification step exposes a defect
- Do not modify: `docs/superpowers/specs/2026-07-04-first-play-design.md` unless product behavior intentionally changes

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected:

- all Vitest suites pass;
- TypeScript exits with code 0;
- Vite produces both side-panel and immersive-page artifacts in `dist`;
- no unhandled warnings from React tests.

- [ ] **Step 2: Load the built extension**

Open `chrome://extensions`, enable Developer Mode, choose “Load unpacked,” and select the repository’s `dist` directory.

Expected: extension loads without manifest or service-worker errors.

- [ ] **Step 3: Verify a brand-new profile at side-panel width**

Clear `emoji-guess-profile` from extension local storage, then open the side panel.

Verify:

- first paint contains a playable Emoji question;
- mode cards, XP, level, streak, theme, profile, and immersive controls are absent;
- first answer can be submitted with one click;
- duplicate rapid clicks do not score twice;
- first two questions are four-choice;
- third question begins with one correct character locked;
- score, combo, timer, progress, share, and skip are hidden through question 3;
- question 4 reveals normal game statistics and starts the 60-second countdown.

- [ ] **Step 4: Verify feedback and hint behavior**

Verify:

- wrong choice remains visibly wrong while remaining choices stay actionable;
- correct feedback advances in approximately 700 ms;
- “帮我一步” removes two wrong choices or locks one spelling character;
- hint cannot be used twice on one question;
- hinted answer receives base/combo score without speed bonus;
- explanation is visible but never requires dismissal.

- [ ] **Step 5: Verify returning-player migration**

Insert a schema-1 profile with nonzero XP and reload.

Expected: it migrates to schema 2, skips the three-question teaching sequence, and opens a directly playable normal question without showing the old mode lobby.

- [ ] **Step 6: Verify accessibility and reduced motion**

Using keyboard only:

- tab to every answer and action;
- confirm visible focus;
- answer a question with Enter/Space;
- verify correct/error state includes text or icon, not color alone.

Enable “减少动态效果” in the profile, replay, and verify no shake, slide, mascot bob, or confetti animation runs.

- [ ] **Step 7: Verify result hierarchy**

Finish a game and confirm:

- “再来一局” is the only primary action;
- daily challenge, share, and profile are reachable;
- level and endless are absent from first-level navigation;
- replay starts immediately.

- [ ] **Step 8: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
git log --oneline --max-count=10
```

Expected: no whitespace errors, only intended files changed, and each task has a focused commit.

- [ ] **Step 9: Commit any verification-only fixes**

If verification required changes, rerun the affected focused test plus all three full checks, then commit:

```bash
git commit -am "fix: close first-play verification gaps"
```
