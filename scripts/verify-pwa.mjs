import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`PWA VERIFY FAILED: ${message}`);
  process.exitCode = 1;
};

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const requiredFiles = [
  'app/+html.tsx',
  'public/manifest.json',
  'public/sw.js',
  'public/offline.html',
  'constants/brand.ts',
  'theme.config.js',
  'lib/native-services.web.ts',
  'lib/native-services.native.ts',
  'lib/notification-listener.web.ts',
  'lib/notification-listener.native.ts',
  'components/date-time-field.web.tsx',
  'components/date-time-field.native.tsx',
  'hooks/use-voice-capture.web.ts',
  'hooks/use-voice-capture.native.ts',
  'lib/secure-storage.web.ts',
  'lib/secure-storage.native.ts',
];

for (const file of requiredFiles) {
  if (!exists(file)) fail(`Missing ${file}`);
}

const manifest = JSON.parse(read('public/manifest.json'));
if (manifest.display !== 'standalone') fail('manifest display is not standalone');
if (manifest.start_url !== '/') fail('manifest start_url is not /');
if (manifest.theme_color !== '#012C3D') fail('manifest theme_color does not use the D-Eagle navy');
if (manifest.background_color !== '#F7F8F3') fail('manifest background_color does not use the D-Eagle paper');

const html = read('app/+html.tsx');
if (!html.includes('manifest.json')) fail('HTML shell is missing manifest link');
if (!html.includes('sw.js')) fail('HTML shell is missing service worker registration');

const sw = read('public/sw.js');
if (!sw.includes('d-eagle-pwa-v2')) fail('service worker cache was not bumped');
if (!sw.includes('/offline.html')) fail('service worker has no offline fallback');

const rootLayout = read('app/_layout.tsx');
if (rootLayout.includes('expo-notifications')) fail('root layout still imports expo-notifications directly');

const source = [
  read('app/(tabs)/index.tsx'),
  read('app/(tabs)/settings.tsx'),
].join('\n');

for (const forbidden of ['expo-speech-recognition', '@react-native-community/datetimepicker']) {
  if (source.includes(forbidden)) fail(`web-facing route directly imports ${forbidden}`);
}

const theme = read('theme.config.js');
for (const color of ['#F8444F', '#F7F8F3', '#78BDC4', '#012C3D']) {
  if (!theme.includes(color)) fail(`theme.config.js is missing brand color ${color}`);
}

if (fs.existsSync(path.join(root, '_archive'))) {
  console.warn('PWA VERIFY WARNING: _archive is present; delivery zip removes it.');
}

if (process.exitCode !== 1) {
  console.log('PWA VERIFY PASSED: source structure and PWA contract are present.');
}
