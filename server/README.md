# Server

Empty until sign-in and AI land. Two small functions will live here:

- **Sign-in.** Google sign-in and the 6-digit email codes.
- **AI.** A function that calls Claude for chapter overviews and quiz cards.

The Anthropic API key lives here and never inside the desktop app, because anything
shipped to a person's machine can be read out of it. A chapter overview is written once,
stored, and served to everyone, so the cost is about 1,189 generations in total rather
than one per tap.

Nothing here is needed to build or run the app. The app works offline and without an
account; signing in only syncs notes and highlights across devices.
