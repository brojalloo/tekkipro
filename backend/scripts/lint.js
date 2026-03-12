const { readdirSync, statSync } = require('fs');
const { join, extname } = require('path');
const { spawnSync } = require('child_process');

const ROOTS = ['src', 'tests', 'scripts', 'prisma'];

function collectJsFiles(entry) {
  if (!statSync(entry).isDirectory()) {
    return extname(entry) === '.js' ? [entry] : [];
  }

  return readdirSync(entry, { withFileTypes: true }).flatMap((dirent) => {
    const fullPath = join(entry, dirent.name);
    return dirent.isDirectory() ? collectJsFiles(fullPath) : (extname(fullPath) === '.js' ? [fullPath] : []);
  });
}

const files = ROOTS.flatMap((root) => collectJsFiles(root));
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push({ file, output: (result.stderr || result.stdout || '').trim() });
  }
}

if (failures.length > 0) {
  console.error('Syntax check failed:');
  failures.forEach(({ file, output }) => {
    console.error(`- ${file}`);
    if (output) console.error(output);
  });
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} file(s).`);