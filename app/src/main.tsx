import React from 'react';
import { createRoot } from 'react-dom/client';
// Every typeface ships inside the app, so the text looks the same offline as on.
import '@fontsource-variable/figtree';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css';
import '@fontsource/frank-ruhl-libre/400.css';
import '@fontsource/frank-ruhl-libre/500.css';
import '@fontsource/gentium-plus/400.css';
import '@fontsource/gentium-plus/400-italic.css';
import '@fontsource/gentium-plus/700.css';
import App from './App';
import './styles/tokens.css';
import './styles/base.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element missing from index.html');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
