// Some hosts (Netlify Drop, Vercel) skip any folder named node_modules, which silently drops
// fonts and images that Expo exports under assets/node_modules. Move that folder to assets/vendor
// and point every reference at the new location.
import fs from 'node:fs';
import path from 'node:path';

const out = path.join(process.cwd(), process.argv[2] ?? 'web-build');
const from = path.join(out, 'assets', 'node_modules');
const to = path.join(out, 'assets', 'vendor');

if (!fs.existsSync(from)) {
  console.log('relocate-assets: nothing to move.');
  process.exit(0);
}

fs.rmSync(to, { recursive: true, force: true });
fs.renameSync(from, to);

let changed = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|html|css|json|map)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes('assets/node_modules')) {
        fs.writeFileSync(full, text.split('assets/node_modules').join('assets/vendor'));
        changed += 1;
      }
    }
  }
};
walk(out);
console.log(`relocate-assets: moved assets/node_modules to assets/vendor, updated ${changed} file(s).`);
