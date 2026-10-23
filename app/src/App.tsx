import { UpdateBanner } from './components/UpdateBanner';
import { Read } from './screens/Read';
import { useSettings } from './lib/settings';

/**
 * Rhema: the Bible and a notepad, side by side.
 *
 * Everything else — progress, how long the rest will take, how the page reads — sits
 * behind one button in the header, so nothing competes with the text.
 */
export default function App() {
  // Reading settings apply to the whole document, so they are set up once here.
  useSettings();

  return (
    <>
      <UpdateBanner />
      <Read />
    </>
  );
}
