import type { GameResult, Question } from "../game/types";

export function buildQuestionShareText(question: Question): string {
  return `猜猜这是什么 👇\n\n${question.emoji}\n\n${question.answer.length} 个字 · ${question.category}\n\n我已经猜出来了，你呢？`;
}

export function buildResultShareText(result: GameResult): string {
  return `我在「猜猜团」拿到了 ${result.score} 分！\n\n答对 ${result.correct} 题 · 最高连击 ${result.bestCombo}\n\n来看看你的脑洞有多大 👀`;
}

interface ShareCardOptions {
  kind: "question" | "result";
  question?: Question;
  result?: GameResult;
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const characters = [...text];
  let line = "";
  let lineIndex = 0;
  for (const character of characters) {
    const next = line + character;
    if (context.measureText(next).width > maxWidth && line) {
      context.fillText(line, x, y + lineIndex * lineHeight);
      line = character;
      lineIndex += 1;
    } else {
      line = next;
    }
  }
  if (line) context.fillText(line, x, y + lineIndex * lineHeight);
}

export async function renderShareCard({ kind, question, result }: ShareCardOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1200;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  context.fillStyle = "#fff8dc";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffd84f";
  context.fillRect(0, 0, canvas.width, 190);

  context.fillStyle = "#342b35";
  context.font = '900 54px "Arial Rounded MT Bold", "PingFang SC", sans-serif';
  context.fillText("猜猜团", 70, 105);
  context.font = '500 26px "PingFang SC", sans-serif';
  context.fillText("一分钟，打开一个新脑洞", 70, 153);

  context.fillStyle = "#fffdf5";
  context.strokeStyle = "#342b35";
  context.lineWidth = 8;
  context.beginPath();
  context.roundRect(55, 250, 790, 650, 44);
  context.fill();
  context.stroke();

  if (kind === "question" && question) {
    context.textAlign = "center";
    context.fillStyle = "#342b35";
    context.font = '700 30px "PingFang SC", sans-serif';
    context.fillText("你能猜出这是什么吗？", 450, 345);
    context.font = '110px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    drawWrappedText(context, question.emoji, 450, 560, 650, 130);
    context.font = '700 32px "PingFang SC", sans-serif';
    context.fillText(`${question.answer.length} 个字 · ${question.category}`, 450, 810);
  } else if (kind === "result" && result) {
    context.textAlign = "center";
    context.fillStyle = "#342b35";
    context.font = '700 32px "PingFang SC", sans-serif';
    context.fillText("我的本局得分", 450, 350);
    context.font = '900 150px "Arial Rounded MT Bold", sans-serif';
    context.fillText(String(result.score), 450, 560);
    context.font = '700 34px "PingFang SC", sans-serif';
    context.fillText(`答对 ${result.correct} 题  ·  最高连击 ${result.bestCombo}`, 450, 700);
    context.font = '80px "Apple Color Emoji", sans-serif';
    context.fillText("🧠⚡🎉", 450, 820);
  }

  context.textAlign = "center";
  context.fillStyle = "#705e65";
  context.font = '600 27px "PingFang SC", sans-serif';
  context.fillText("复制图片发给朋友，看看谁先猜出来", 450, 1015);
  context.fillStyle = "#ff6f83";
  context.beginPath();
  context.roundRect(240, 1060, 420, 72, 20);
  context.fill();
  context.fillStyle = "#342b35";
  context.font = '900 28px "PingFang SC", sans-serif';
  context.fillText("EMOJI GUESS · 猜猜团", 450, 1107);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG generation failed")), "image/png");
  });
}
