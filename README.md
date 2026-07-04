# 猜猜团 Emoji Guess

一款以 Chrome Side Panel 为主入口的离线 Emoji 猜词游戏。

## 已实现

- 60 秒限时、10 题闯关、三条生命无尽、每日挑战
- 全程点击作答：简单题四选一，普通及以上难度点击字块拼答案
- 500 道独立策划题目、答后脑洞解释与确定性每日题组
- 题目与成绩可复制为微信文字或 PNG 分享卡片
- 答案别名、三级提示、速度奖励、连击倍率
- 本地等级、经验、连续挑战、历史最佳与每日正式成绩
- 三套贴纸主题、减少动态效果、键盘操作
- Side Panel 与独立沉浸页面

## 安装

```bash
npm install
npm run build
```

在 Chrome 打开 `chrome://extensions`，开启“开发者模式”，点击“加载已解压的扩展程序”，选择本项目的 `dist` 目录。点击工具栏中的“猜猜团”图标即可打开侧边栏。

## 开发与验证

```bash
npm run dev
npm test
npm run typecheck
npm run build
```

首版完全离线，不需要 API Key 或服务器。排行榜仅保存在当前 Chrome 用户资料中。

## 目录结构

```text
src/
  app/             应用编排与页面切换
  entries/         Side Panel 与沉浸页入口
  features/        按游戏、首页、档案、结算和分享组织的功能代码
  content/         静态题库
  ui/              共享视觉组件
  styles/          全局设计系统
  test/            领域与内容测试
public/
  icons/           扩展与工具栏图标
  service-worker.js
```
