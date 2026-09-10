# Keep

Browser app for sorting photos — and separately, videos — by keep or skip.

- **Keep** (swipe right, →, or the Keep button) copies that item into the next round.
- **Skip** (swipe left, ←, or the Skip button) drops it from this pass only.
- **Originals are never moved or deleted.**
- Rounds stay in this browser until you tap **Export when sure** (a zip).

Header shows `Round N of Keep`.

This is a website. People using it do not install Node. Node is only if you run the source yourself.

## How to use

1. Open Keep in a browser.
2. Choose **Photos** or **Videos**.
3. Start from a sample walk, files on this device, a folder, or Google Drive.
4. Phone / tablet: swipe the picture. Laptop / desktop: Skip is far left, Keep is far right. Arrow keys work on any keyboard. **Z** undoes.
5. When the deck is empty, open the next Keep round and sort the smaller set again.
6. Export only when you are sure.

Sessions live in this browser (not the cloud). Same device + same browser → you can continue later.

Google Photos albums cannot be opened directly (Library API limit). Save the album to this device or Drive first.

Google Drive works when Keep is running on Grok (preview or a published `*.grok.me` link).

## Run from git

Needs [Node.js 22+](https://nodejs.org/).

```bash
git clone https://github.com/shirishkirtiwar/keep.git
cd keep
npm install
npm run dev
```

Then open the URL Vite prints (port 8080).

```bash
npm run build    # production build
npm run typecheck
```

## Repo layout

| Path | What |
|---|---|
| `src/components` | Landing, swipe deck, session hub, Drive picker |
| `src/lib/keep-store.ts` | Rounds, undo, persist |
| `public/samples` | Sample walk photos |

## License

Personal use. Add a license file if you publish it.
