import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QUESTIONS } from "../content/questions";
import { GameScreen } from "../features/game/GameScreen";
import { createGame } from "../features/game/game";
import { buildFirstPlayQuestions } from "../features/onboarding/firstPlay";

afterEach(cleanup);

const firstQuestions = buildFirstPlayQuestions(QUESTIONS);

function renderGame(index: number, onboarding = true) {
  const state = { ...createGame("timed", firstQuestions, 1_000, { onboarding }), index };
  const props = {
    state,
    secondsLeft: 60,
    bestScore: 600,
    onSubmit: vi.fn(),
    onHint: vi.fn(),
    onSkip: vi.fn(),
    onExit: vi.fn(),
  };
  const view = render(<GameScreen {...props} />);
  return { ...view, props };
}

describe("GameScreen first-play behavior", () => {
  it("keeps remaining choices enabled after a wrong answer", () => {
    const { props } = renderGame(1);
    const correct = firstQuestions[1].answer;
    const wrong = screen.getAllByRole("button").find((button) =>
      button.textContent !== correct && button.textContent !== "←" && !button.textContent?.includes("帮我")
    );
    if (!wrong) throw new Error("Expected a wrong answer");
    fireEvent.click(wrong);
    expect((screen.getByRole("button", { name: correct }) as HTMLButtonElement).disabled).toBe(false);
    expect(props.onSubmit).toHaveBeenCalled();
  });

  it("removes two choices with one hint", () => {
    renderGame(1);
    fireEvent.click(screen.getByRole("button", { name: "💡 帮我一步" }));
    expect(screen.getAllByText("已排除")).toHaveLength(2);
  });

  it("locks the first correct character on onboarding question three", () => {
    const { container } = renderGame(2);
    expect(container.querySelector(".answer-slot--locked")?.textContent).toBe("破");
  });

  it("hides scoring systems before question four", () => {
    renderGame(2);
    expect(screen.queryByText("得分")).toBeNull();
    expect(screen.queryByText(/刷新最佳/)).toBeNull();
    expect(screen.queryByText(/60s/)).toBeNull();
  });
});
