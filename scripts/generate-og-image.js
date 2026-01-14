const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'public', 'og', 'og-image.svg');
const out = path.join(root, 'public', 'og', 'og-image.png');

function which(cmd) {
  const res = spawnSync('sh', ['-lc', `command -v ${cmd}`], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const p = String(res.stdout || '').trim();
  return p || null;
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  return res.status === 0;
}

function ensureSrc() {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing source SVG: ${src}`);
  }
}

function main() {
  ensureSrc();

  const rsvg = which('rsvg-convert');
  if (rsvg) {
    const ok = run(rsvg, ['-w', '1200', '-h', '630', '-o', out, src]);
    if (ok) return;
  }

  const inkscape = which('inkscape');
  if (inkscape) {
    const ok = run(inkscape, [
      src,
      '--export-type=png',
      '--export-filename',
      out,
      '--export-width=1200',
      '--export-height=630',
    ]);
    if (ok) return;
  }

  const magick = which('magick');
  if (magick) {
    const ok = run(magick, ['convert', '-background', 'none', src, '-resize', '1200x630!', out]);
    if (ok) return;
  }

  const convert = which('convert');
  if (convert) {
    const ok = run(convert, ['-background', 'none', src, '-resize', '1200x630!', out]);
    if (ok) return;
  }

  throw new Error(
    'No SVG->PNG converter found. Install one of: librsvg (rsvg-convert), inkscape, or imagemagick.'
  );
}

try {
  main();
  process.stdout.write(`Generated: ${out}\n`);
} catch (e) {
  process.stderr.write(`${e.message || e}\n`);
  process.exit(1);
}
