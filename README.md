# WakaTime Box for LifeOS

[中文说明 →](./README.zh-CN.md)

Keep your [WakaTime](https://wakatime.com/) day inside your [LifeOS](https://github.com/quanru/obsidian-lifeos) daily note — automatically.

![WakaTime box inside a LifeOS daily note](./docs/screenshot.webp)

## What it does

- Fetches your WakaTime summary of the day and refreshes a fenced `wakatime` code block inside today's LifeOS daily note.
- Fills the block as soon as LifeOS creates today's note, so there is nothing to do by hand.
- Refreshes once per hour, and on demand from the settings buttons, the command palette, or hotkeys you bind yourself.
- Lets you choose what the box shows: **projects**, **languages**, **editors** or **categories**.
- Can copy the box of any date to the clipboard, for weekly notes or reports.

The box looks like this in your note:

````markdown
```wakatime
obsidian-vault     3 hrs 12 mins   ██████████▎░░░░░░░░░   51.4 %
some-api           1 hr 48 mins    █████▋░░░░░░░░░░░░░░   28.6 %
notes-app          48 mins         ██▌░░░░░░░░░░░░░░░░░   12.8 %
blog               27 mins         █▍░░░░░░░░░░░░░░░░░░    7.2 %
```
````

## Requirements

- Obsidian 1.1.7 or newer (desktop or mobile)
- [LifeOS](https://github.com/quanru/obsidian-lifeos) installed and enabled, with **Periodic Notes** turned on
- A [WakaTime](https://wakatime.com/) account and your [API key](https://wakatime.com/api-key)

This plugin is built for LifeOS: it reads the LifeOS settings (periodic notes folder and daily note format) to find `<periodic notes>/<YYYY>/Daily/<MM>/<date>.md`, and it never creates notes itself — creating daily notes stays LifeOS's job.

## Installation

### BRAT (recommended)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2. In the BRAT settings choose *Add Beta plugin* and enter `Luke-Evan/obsidian-wakatime-box-lifeos`.
3. Enable *WakaTime Box for LifeOS* in Settings → Community plugins.

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/Luke-Evan/obsidian-wakatime-box-lifeos/releases/latest).
2. Create the folder `<your vault>/.obsidian/plugins/wakatime-box-lifeos/` and put both files into it.
3. Enable the plugin in Settings → Community plugins.

### From source

```bash
npm install
npm run dev      # watch mode, writes main.js
npm run build    # type-check + production bundle
npm run lint
```

## First steps

1. Paste your WakaTime API key into the plugin settings.
2. Put an empty block into your LifeOS daily note template:

   ````markdown
   ```wakatime
   ```
   ````

   If a note has no block yet, the plugin appends one at the end of the note.
3. Open today's daily note — the box appears after a few seconds.

## Settings

| Setting | Description |
| --- | --- |
| WakaTime API key | Your key from [wakatime.com/api-key](https://wakatime.com/api-key). It is stored in this vault only. |
| Display data | Which WakaTime breakdown is written into the note: projects, languages, editors or categories. The six biggest entries of the day are shown. |
| Sync now | Buttons that fetch today's or yesterday's stats and update the note immediately. |

The settings tab also shows the daily note that is currently targeted, so the LifeOS integration can be verified at a glance.

## Commands

| Command | Description |
| --- | --- |
| Refresh today's stats | Re-fetch today and update today's note. |
| Refresh yesterday's stats | Re-fetch yesterday and update yesterday's note. |
| Copy the stats of any date to the clipboard | Opens a date prompt and copies that day's box. |

Every command can be bound to a hotkey in Settings → Hotkeys (search for *WakaTime*), so today's or yesterday's stats can be synced with a single key press.

## Notes

- **Cache.** Every fetched day is cached for one hour in `.obsidian/plugins/wakatime-box-lifeos/cache/`, so restarting Obsidian does not hit the WakaTime API again.
- **Privacy.** The API key never leaves your vault except as an `Authorization` header sent directly to `wakatime.com`.
- **Quiet by design.** Automatic refreshes only notify you when the note content actually changed; manual commands always report their result.

## Credits

- Fork of [simonla/obsidian_waka_box](https://github.com/simonla/obsidian_waka_box) (MIT), where the `wakatime` code block idea started.
- The daily note layout follows [LifeOS](https://github.com/quanru/obsidian-lifeos) by quanru.

## License

[MIT](./LICENSE)
