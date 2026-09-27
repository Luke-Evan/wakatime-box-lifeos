# WakaTime Box for LifeOS（中文说明）

[English →](./README.md)

把你的 [WakaTime](https://wakatime.com/) 每日统计自动写进 [LifeOS](https://github.com/quanru/obsidian-lifeos) 的日记里。

![日记中的 WakaTime 统计块](./docs/screenshot.webp)

## 功能

- 拉取当天的 WakaTime 统计，刷新当天 LifeOS 日记中的 ```wakatime 代码块。
- LifeOS 一创建今天的日记，插件就会自动把统计块填进去，无需手动操作。
- 每小时自动刷新一次，也可以用命令面板手动刷新。
- 展示内容可选：**项目（projects）**、**语言（languages）**、**编辑器（editors）**、**类别（categories）**。
- 可以把任意一天的统计块复制到剪贴板，方便写周报或总结。

日记中的效果：

````markdown
```wakatime
obsidian-vault     3 hrs 12 mins   ██████████▎░░░░░░░░░   51.4 %
some-api           1 hr 48 mins    █████▋░░░░░░░░░░░░░░   28.6 %
notes-app          48 mins         ██▌░░░░░░░░░░░░░░░░░   12.8 %
blog               27 mins         █▍░░░░░░░░░░░░░░░░░░    7.2 %
```
````

## 依赖

- Obsidian 1.1.7 及以上（桌面端 / 移动端均可）
- 已安装并启用 [LifeOS](https://github.com/quanru/obsidian-lifeos)，且打开了 **Periodic Notes（周期笔记）**
- 一个 [WakaTime](https://wakatime.com/) 账号和 [API key](https://wakatime.com/api-key)

本插件专为 LifeOS 设计：它读取 LifeOS 的设置（周期笔记目录、日记文件名格式）来定位 `<周期笔记目录>/<YYYY>/Daily/<MM>/<日期>.md`。插件自己**不会**创建日记，创建日记始终是 LifeOS 的职责。

## 安装

### 通过 BRAT（推荐）

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件。
2. 在 BRAT 设置中选择 *Add Beta plugin*，输入 `Luke-Evan/obsidian-wakatime-box-lifeos`。
3. 在「设置 → 第三方插件」中启用 *WakaTime Box for LifeOS*。

### 手动安装

1. 从 [最新 Release](https://github.com/Luke-Evan/obsidian-wakatime-box-lifeos/releases/latest) 下载 `main.js` 和 `manifest.json`。
2. 在仓库中创建 `<你的仓库>/.obsidian/plugins/wakatime-box-lifeos/` 目录，把两个文件放进去。
3. 在「设置 → 第三方插件」中启用本插件。

### 从源码构建

```bash
npm install
npm run dev      # 监听模式，输出 main.js
npm run build    # 类型检查 + 生产构建
npm run lint
```

## 使用步骤

1. 在插件设置中填入 WakaTime API key。
2. 在 LifeOS 的日记模板中放一个空代码块：

   ````markdown
   ```wakatime
   ```
   ````

   如果日记里还没有这个块，插件会把它追加到笔记末尾。
3. 打开今天的日记，几秒后统计块就会出现。

## 设置

| 设置项 | 说明 |
| --- | --- |
| WakaTime API key | 从 [wakatime.com/api-key](https://wakatime.com/api-key) 获取，只保存在当前仓库中。 |
| Display data | 写入日记的统计维度：项目 / 语言 / 编辑器 / 类别，默认展示当天耗时最多的 6 条。 |

设置页还会显示当前将要写入的日记路径，方便确认 LifeOS 是否配置正确。

## 命令

| 命令 | 说明 |
| --- | --- |
| Refresh today's stats | 重新拉取今天的数据并更新今天的日记。 |
| Refresh yesterday's stats | 重新拉取昨天的数据并更新昨天的日记。 |
| Copy the stats of any date to the clipboard | 弹出日期输入框，把该日期的统计块复制到剪贴板。 |

## 其他说明

- **缓存**：每天的数据会在 `.obsidian/plugins/wakatime-box-lifeos/cache/` 中缓存一小时，重启 Obsidian 不会重复请求 WakaTime API。
- **隐私**：API key 只以 `Authorization` 请求头的形式直接发给 `wakatime.com`，不会经过任何第三方。
- **安静运行**：自动刷新只在日记内容真的发生变化时才弹出提示；手动命令始终会反馈结果。

## 致谢

- 本项目 fork 自 [simonla/obsidian_waka_box](https://github.com/simonla/obsidian_waka_box)（MIT），`wakatime` 代码块的思路来自它。
- 日记路径规则遵循 quanru 的 [LifeOS](https://github.com/quanru/obsidian-lifeos)。

## 许可证

[MIT](./LICENSE)
