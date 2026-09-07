# macOS desktop testing from this fork

The Hindsight branch is `feat/hindsight-memory` in `casquijo/OpenMausBot`.
A Git commit does not update an installed desktop app: install a newly packaged
app to run this code on another Mac.

## Build on an Apple Silicon Mac

Use Node 24+, pnpm 10.33.0 and the Xcode command-line tools:

```sh
pnpm install --frozen-lockfile
pnpm package:mac:fork
```

The command builds an ARM64 DMG in `release/`. It uses
`electron-builder.fork.yml`, inherits the original resource packaging, and points
the embedded updater at `casquijo/OpenMausBot`. It does not publish a GitHub release.
The normal `package:mac` command still uses the upstream configuration.

This personal test build uses an ad-hoc signature, with no Apple Developer ID or
notarization. It is not equivalent to the signed official distribution. macOS
may require an explicit **Privacy & Security → Open Anyway** approval and renewed
permissions or logins. See [Apple's instructions](https://support.apple.com/en-ie/102445).
Do not disable Gatekeeper globally.

## Install on the MacBook

This build intentionally keeps the original application identity and data paths.
It replaces the original app; renaming the app does not isolate its data.

1. Check the installed version in About. This branch starts from upstream 0.1.62;
   if the installed app is newer, review compatibility before opening its data
   with this build.
2. Quit OpenMausBot completely. Keep the original installer for rollback. Back up
   `~/.openmausbot` and `~/Library/Application Support/OpenMausBot` on the MacBook
   while the app is closed. These folders can contain credentials; keep the
   backup private. Keychain credentials may still require a new login.
3. Copy the DMG from the Mac mini to the MacBook. If a SHA-256 receipt accompanies
   it, compare `shasum -a 256` on the copy with that receipt.
4. Open the DMG and copy `OpenMausBot.app` into Applications, replacing the old
   app. Launch the installed copy, not the app inside the mounted DMG.
5. Confirm About shows `0.1.62-hindsight.2`, check the existing bots, and configure
   one bot through **Settings → Memory → Hindsight**. Follow the
   [Hindsight verification steps](hindsight-memory.md).

Updates now query the fork, not upstream. This does not establish working signed
auto-updates: install later personal test builds manually. The prerelease version
also selects a Hindsight update channel. Do not publish stable upstream release
metadata for these personal builds.

To roll back, quit the app, reinstall the original version and restore the closed
app's saved data if necessary. Facts already submitted to Hindsight are external
and are not undone by restoring local data.

Local packaging and isolated tests cannot establish production compatibility
with an uninspected MacBook installation or an unconfigured Hindsight service.

## Verification receipt

On 2026-09-07, `pnpm package:mac:fork` produced the ARM64 DMG. The packaged app
passed `codesign --verify --deep --strict` with an ad-hoc signature and the DMG
passed `hdiutil verify`. Its embedded updater points to `casquijo/OpenMausBot`;
the packaged UI contains Hindsight and reports `0.1.62-hindsight.1`.

The existing `smoke-packaged-server.mjs` fixture, pointed at the app's actual
`Contents/Resources/server` and browser bundle, verified startup without nearby
`node_modules`, all nine spawned proxy paths, MCP initialize/health/drain, and
browser discovery. Installation, permissions and a live conversation on the
MacBook remain user acceptance checks. No real Hindsight service was contacted.

### 0.1.62-hindsight.2

Built on 2026-09-07 with the browser/Codex PATH fix from `285a29bc`. The mounted
DMG passed signature and image-integrity checks; its server contains the fix,
its UI reports `.2`, and its updater still targets the fork. The two regression
scenarios also passed against the packaged server itself: both the default
`codex` command and an absolute CLI path completed a fake turn with browser MCP
enabled and the user's local binary directory retained in PATH.

Artifact: `release/OpenMausBot-0.1.62-hindsight.2-arm64.dmg`.
SHA-256: `4b689ba4b23115043de7876be4af2f27517baa3e87abae87dd6718d62751694d`.
This verification used temporary data; the MacBook installation was not changed.
