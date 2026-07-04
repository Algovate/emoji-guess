# 发布到 Chrome Web Store / Publish Guide

## 0. 本次已为你准备好的东西 / Already prepared
- ✅ `emoji-guess-v1.0.0.zip`（仓库根目录）—— **要上传的包**，manifest 已在 ZIP 根目录。
- ✅ 合规自检通过：无 host 权限、无远程代码、无 eval、版本号一致、图标尺寸正确。
- ✅ `webstore/STORE_LISTING.md` —— 标题/简介/描述/关键词/权限说明。
- ✅ `webstore/PRIVACY.md` —— 隐私政策（需自行挂到公开 URL）。
- ⚠️ 还需你自己做：**截图**、**注册开发者账号**、**实际上传并提交**。

> 重新打包（如改了代码）：`npm run build && cd dist && zip -r -X ../emoji-guess-v1.0.0.zip . -x "*.DS_Store"`

---

## 1. 注册开发者账号（一次性，$5）
1. 用你的 Google 账号打开 https://chrome.google.com/webstore/devconsole/ 。
2. 接受《开发者协议》。
3. 支付一次性注册费 **$5 USD**（信用卡 / Google Pay）。之后终身可发布不限数量的扩展。

> 账号一旦注册无法退款，也无法把 $5 转给他人，确认好用的 Google 账号再付。

---

## 2. 新建项目并上传 ZIP
1. 在 Developer Dashboard 点 **「新增项目 / New Item」**。
2. 上传 `emoji-guess-v1.0.0.zip`。
3. 上传成功后，包名、版本、manifest 会自动读出（应显示：猜猜团 Emoji Guess · 1.0.0）。

---

## 3. 填写商店信息（Store Listing）
照 `webstore/STORE_LISTING.md` 填：
- **商品名称**：`猜猜团 Emoji Guess`
- **摘要**：复制中文一句话简介（≤132 字符）。
- **描述**：复制中文详细描述。
- **语言**：中文（简体），仅此一种。
- **类别**：Games。
- **图标**：上传 `public/icons/icon-128.png`（128×128）。
- **截图**：上传至少 1 张（建议 3 张：开始页/答题中/结算分享）。尺寸 1280×800 或 640×400。
- **小宣传图（440×280）**：推荐做一张，利于搜索结果展示。

---

## 4. 隐私权（Privacy Practices）
1. 先把 `webstore/PRIVACY.md` 挂到一个公开 URL。最快方式：
   - **GitHub Gist**：https://gist.github.com 新建 gist，粘贴内容，点 Create，得到 `https://gist.githubusercontent.com/.../raw/...` 链接；或
   - **GitHub Pages**：把文件推到仓库 `docs/PRIVACY.md`，仓库 Settings → Pages 开启。
2. 在 Dashboard 的 **「隐私权政策 URL」** 填该链接。
3. 「数据处理」问卷：**全部选「否」**（本扩展不收集任何数据）。
4. 认证勾选「我不出售/转移用户数据」等承诺项。

> 关于权限说明：Dashboard 会列出 `sidePanel / storage / clipboardWrite`，按 STORE_LISTING.md 的「权限说明」表填写用途。

---

## 5. 可见性（Distribution）
- **可见性**：选「公开 / Public」（首版不要选「未列出 / Unlisted」，否则搜不到）。
- 地区：默认「所有地区 / All regions」即可。

---

## 6. 提交审核
1. 顶部点 **「提交审核 / Submit for review」**。
2. 状态变为 **「审核中 / In review」**。
3. 审核时长：通常 **几小时 ~ 几天**，新账号/首版可能更久。
4. 通过后会收到邮件，状态变 **「已发布 / Published」**，扩展即可在商店被搜索和安装。

---

## 常见被拒原因（已规避，供自查）
- ❌ 缺少隐私政策 → 已备 `PRIVACY.md`。
- ❌ 权限过多/用途不清 → 仅 3 个，已写用途。
- ❌ 申请 `host_permissions` 或 `<all-tabs>` → 本扩展**没有**。
- ❌ 远程代码 / eval → 已自检为 0。
- ❌ 单一用途不清晰 → 明确是“Emoji 猜词游戏”，无歧义。
- ❌ 截图缺失或与功能不符 → 上传真实侧边栏截图。
- ❌ 描述与实际功能不符 → STORE_LISTING.md 与 README/PRD 一致。

---

## 发布后的小建议
- 首次审核期间可继续在本地用「加载已解压」测试 `dist/`。
- 发新版：改 `manifest.json` 和 `package.json` 的 `version`（保持一致），重新 build + 打包，在 Dashboard「打包 / Package」上传新 ZIP。
- 想收集真实反馈：在描述里写明商店反馈入口；首版功能稳定后再迭代 V1.1（每日排行榜、分享等）。
