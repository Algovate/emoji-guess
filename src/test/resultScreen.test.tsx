import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultScreen } from "../features/results/ResultScreen";
import { DEFAULT_PROFILE } from "../features/profile/playerStorage";

afterEach(cleanup);

describe("ResultScreen", () => {
  it("keeps replay primary and exposes only useful secondary actions", () => {
    const { container } = render(
      <ResultScreen
        result={{ mode: "timed", score: 800, correct: 6, attempts: 8, bestCombo: 4, elapsedSeconds: 60, hintsUsed: 0 }}
        profile={DEFAULT_PROFILE}
        isRecord={false}
        onAgain={vi.fn()}
        onDaily={vi.fn()}
        onProfile={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "再玩一局" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "每日挑战" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "查看档案" })).toBeTruthy();
    expect(container.querySelectorAll(".primary-button")).toHaveLength(1);
    expect(screen.queryByText("闯关")).toBeNull();
    expect(screen.queryByText("无尽")).toBeNull();
  });
});
