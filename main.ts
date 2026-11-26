// Merapi Courier — the entry program (Node 22, standard library only).
//
// It hands the game in: it copies this repository's game/ and screenshots/
// beside this file into the output directory and writes dossier.json there,
// using the make.fun library vendored at vendor/makefun-game.ts. The grader
// runs it twice and both runs must write the same bytes; there is nothing
// here that depends on the clock, the network, or the machine, so they do.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(source, destination) {
  if (!existsSync(source)) return;
  cpSync(source, destination, { recursive: true });
}

function writeDossier() {
  // The scorer's caps for this bounty: the text budget shapes the dossier,
  // the rest refuse an entry the scorer would refuse anyway.
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

// After the copy, prove the hand-in is complete before the grader ever sees
// it: the game entry point and the dossier must be there, and the
// screenshots must number 3 or 4. A missing piece fails loudly here instead
// of silently at the gate.
function verifyOutput() {
  const missing = [];
  if (!existsSync(join(outputDir, 'game', 'index.html'))) missing.push('game/index.html');
  if (!existsSync(join(outputDir, 'dossier.json'))) missing.push('dossier.json');
  const shots = readdirSync(join(outputDir, 'screenshots')).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) missing.push(`screenshots (${shots.length} files)`);
  if (missing.length > 0) {
    throw new Error(`incomplete output, missing: ${missing.join(', ')}`);
  }
  console.log(`Merapi Courier entry written to ${outputDir} (${shots.length} screenshots, dossier ok)`);
}

// Start from a clean output directory so a stale file from an earlier run
// can never ride along into the entry.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

writeDossier();
verifyOutput();
