import { useEffect, useState } from "react";
import type { GameResult, Question } from "../game/types";
import { buildQuestionShareText, buildResultShareText, renderShareCard } from "./shareCard";

interface ShareSheetProps {
  question?: Question;
  result?: GameResult;
  onClose: () => void;
}

export function ShareSheet({ question, result, onClose }: ShareSheetProps) {
  const [image, setImage] = useState<Blob>();
  const [status, setStatus] = useState("正在准备分享卡片…");
  const text = question ? buildQuestionShareText(question) : buildResultShareText(result!);
  const kind = question ? "question" : "result";

  useEffect(() => {
    let active = true;
    void renderShareCard({ kind, question, result })
      .then((blob) => {
        if (active) {
          setImage(blob);
          setStatus("题目不会包含答案，可以放心分享");
        }
      })
      .catch(() => active && setStatus("图片生成失败，仍可复制文字"));
    return () => { active = false; };
  }, [kind, question, result]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("已复制，去微信考考朋友吧！");
    } catch {
      setStatus("复制失败，请重试或手动选择预览文字");
    }
  }

  async function copyImage() {
    if (!image) return;
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard.write) throw new Error("Image clipboard unavailable");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
      setStatus("图片已复制，打开微信直接粘贴吧！");
    } catch {
      await copyText();
      setStatus("当前环境不能复制图片，已改为复制文字");
    }
  }

  return (
    <div className="share-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <header><div><span className="share-sticker">↗</span><h2 id="share-title">{question ? "分享这道脑洞题" : "晒晒本局成绩"}</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭分享">×</button></header>
        <pre className="share-preview">{text}</pre>
        <p className="share-status" aria-live="polite">{status}</p>
        <div className="share-buttons">
          <button className="primary-button" onClick={copyText}>复制文字</button>
          <button className="primary-button share-image-button" onClick={copyImage} disabled={!image}>复制图片</button>
        </div>
        <small>复制后打开微信，在聊天输入框中粘贴即可。</small>
      </section>
    </div>
  );
}
