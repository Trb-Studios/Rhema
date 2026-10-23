# Setting up a Windows machine

Do this once. Everything here is free. Budget about forty minutes, most of it waiting
on downloads.

## 1. Visual Studio Build Tools

Tauri compiles Rust into a real Windows program, which needs Microsoft's C++ compiler.

1. Download **Build Tools for Visual Studio** from
   <https://visualstudio.microsoft.com/visual-cpp-build-tools/>.
2. Run it. In the installer, tick **Desktop development with C++**.
3. Install. This is the big one, around 3 to 6 GB.

## 2. Rust

Download and run **rustup-init.exe** from <https://rustup.rs>. Accept the default
option. When it finishes, close and reopen your terminal.

## 3. Node.js

Install the **LTS** version from <https://nodejs.org>. Accept the defaults.

## 4. Git

Install from <https://git-scm.com/download/win>. Accept the defaults, except: when it
asks about the default editor, choose whichever you prefer.

## 5. VS Code

Install from <https://code.visualstudio.com>, then add these extensions:

- **rust-analyzer**
- **Tauri**
- **ESLint**
- **Prettier**

## 6. WebView2

Already on Windows 11 and on up-to-date Windows 10. Nothing to do unless the app later
complains it is missing.

## Check it worked

Open a new terminal and run:

```bash
node --version      # v22 or newer
npm --version
rustc --version     # 1.77 or newer
cargo --version
git --version
```

SQLite needs no separate install: the database build script uses the one built into
Node, which is why Node 22 is the minimum.

Then clone the project and start it:

```bash
git clone https://github.com/Trb-Studios/Rhema.git
cd Rhema
npm install
npm run data:build
npm run dev
```

The first `npm run dev` compiles Rust from scratch and takes several minutes. Every run
after that takes seconds. A window should open with the app's tan interface.

## If something goes wrong

| What you see                  | What to do                                                   |
| ----------------------------- | ------------------------------------------------------------ |
| `link.exe not found`          | Step 1 did not finish, or the C++ workload was not ticked    |
| `cargo` not recognised        | Reopen the terminal after installing Rust                    |
| `node:sqlite` cannot be found | Node is older than 22; install the current LTS               |
| The window opens blank        | Check the terminal for a Vite error; try `npm install` again |
