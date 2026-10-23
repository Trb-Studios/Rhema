# Releasing and the update manager

## How updating works

The app asks GitHub Releases whether a newer version exists, four seconds after launch
so startup is never held up. If one exists it downloads quietly in the background. Only
when it is ready does a strip appear offering a restart. The person chooses when.

Every update is signed. Tauri checks the signature against the public key built into the
app and refuses anything that does not match, so a tampered or corrupted download cannot
install itself.

## One-time setup

### 1. Create the signing key pair

Run this once, on your own machine, in the project folder:

```bash
npm run tauri signer generate -- -w ./tauri-signing-key
```

It asks for a password. Use one and keep it. You get two files:

- `tauri-signing-key` — the private key. **Never commit this.** `.gitignore` already
  blocks it. Keep a copy in your password manager; losing it means nobody can install
  updates on top of the current version.
- `tauri-signing-key.pub` — the public key. This one is safe to commit.

### 2. Put the public key in the app

Open `app/src-tauri/tauri.conf.json`, find `plugins.updater.pubkey`, and replace
`REPLACE_WITH_PUBLIC_KEY` with the contents of `tauri-signing-key.pub`.

### 3. Add the private key to GitHub

In the repository, go to Settings, then Secrets and variables, then Actions, and add two
repository secrets:

| Name                                 | Value                                     |
| ------------------------------------ | ----------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | the whole contents of `tauri-signing-key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the password you chose                    |

## Cutting a release

1. Move the notes in `CHANGELOG.md` from Unreleased under a new version heading.
2. Set the same version number in `app/package.json` and `app/src-tauri/tauri.conf.json`.
3. Commit, then tag and push:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The Release workflow builds the installer on a Windows runner, signs it, and publishes it
along with `latest.json`. Anyone running an older version is offered the update on their
next launch.

## Version numbers

`0.1.0`, `0.2.0`, and so on while the app is being built. The middle number goes up when
features land, the last when only fixes do. The version shows in the side rail and in
Settings, so a bug report always says which build it came from.

## The SmartScreen warning

Until the app is code-signed with a certificate, Windows shows "Windows protected your
PC" on first install. That is expected, and the release notes tell people to choose More
info, then Run anyway. A code-signing certificate removes it. It costs money and needs
identity verification, so it is worth doing only before sharing the app widely.
