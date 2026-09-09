# macOS desktop testing from this fork

This desktop build adds optional per-bot Hindsight memory to upstream 0.1.69.
Its version is `0.1.69-hindsight.1`. A Git commit does not update an installed
desktop app: install a newly packaged app to run this code on another Mac.

## Build on an Apple Silicon Mac

Use Node 24+, pnpm 10.33.0 and the Xcode command-line tools:

```sh
pnpm install --frozen-lockfile
pnpm package:mac:fork
```

The command creates `release/OpenMausBot-0.1.69-hindsight.1-arm64.dmg` using
`electron-builder.fork.yml`. It preserves the original resource packaging and
points the embedded updater at `casquijo/OpenMausBot`. It does not publish a
GitHub release. The normal `package:mac` command still uses the upstream feed.
Never upload fork artifacts or update metadata to the official release channel.

This build has an ad-hoc signature without Apple Developer ID notarization.
macOS may require **Privacy & Security → Open Anyway** and renewed permissions
or logins. Do not disable Gatekeeper globally.

## Verify and install

Run the checks required by `CONTRIBUTING.md`, then verify the packaged app with
the isolated procedures in [the verification guide](verification/README.md).
Check the DMG with `hdiutil verify`, verify the app signature with
`codesign --verify --deep --strict`, and record a SHA-256 checksum. Confirm the
packaged `Contents/Resources/app-update.yml` targets the fork.

This build keeps the original application identity and data paths. It replaces
the original app; renaming the app does not isolate its data.

1. Check the installed version in About. If it is newer than this build, review
   data compatibility before installing.
2. Quit OpenMausBot completely. Keep the previous installer for rollback and
   privately back up `~/.openmausbot` and
   `~/Library/Application Support/OpenMausBot` while the app is closed. These
   folders can contain credentials; Keychain credentials may need a new login.
3. Copy the DMG to the target Mac and compare its SHA-256 checksum with the build
   receipt. Replace the app in Applications and launch the installed copy.
4. Confirm About shows `0.1.69-hindsight.1`, check existing bots, and follow the
   [Hindsight verification steps](hindsight-memory.md).

Updates query the fork. This does not establish working signed auto-updates;
install subsequent personal test builds manually. The prerelease version selects
the Hindsight update channel. Do not publish stable upstream release metadata.

To roll back, quit the app, reinstall the previous version and restore the
closed app's saved data if necessary. Facts already submitted to Hindsight are
external and are not undone by restoring local data.

Local packaging and isolated tests do not establish compatibility with an
uninspected installation or an unconfigured Hindsight service.
