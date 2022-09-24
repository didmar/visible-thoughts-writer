import { exit } from 'process';
import {
  Step,
  addSteps,
  Bullet,
  Thought,
  updateRunLongTermThoughts,
} from '../src/firebase-app';

function randomThoughtsSection(): Bullet[] {
  const nbBullets = Math.floor(1 + Math.random() * 10);
  const bullets: Bullet[] = [];
  for (let i = 0; i < nbBullets; i++) {
    const nbThoughts = Math.floor(1 + Math.random() * 10);
    const thoughts: Thought[] = [];
    for (let j = 0; j < nbThoughts; j++) {
      thoughts.push({
        txt: 'Lorem ipsum '.repeat(1 + Math.floor(Math.random() * 20)),
        type: Math.floor(Math.random() * 4),
        lt: false,
      });
    }
    bullets.push({ T: thoughts });
  }
  return bullets;
}

async function main(): Promise<void> {
  const runId = '9Eu80GJttvrbu1S5ieAn';

  const steps: Step[] = [];
  for (let n = 1; n <= 500; n++) {
    const initT = randomThoughtsSection();
    const ppt = 'Lorem ipsum '.repeat(1 + Math.floor(Math.random() * 20));
    const pptYBR = Math.random() < 0.1;
    const ppptT = randomThoughtsSection();
    const act = 'Lorem ipsum '.repeat(1 + Math.floor(Math.random() * 10));
    const actYBR = Math.random() < 0.1;
    const pactT = randomThoughtsSection();
    const out = 'Lorem ipsum '.repeat(1 + Math.floor(Math.random() * 20));
    const outYBR = Math.random() < 0.1;
    const step = new Step(
      n,
      initT,
      ppt,
      pptYBR,
      ppptT,
      act,
      actYBR,
      pactT,
      out,
      outYBR
    );
    steps.push(step);
  }
  await addSteps(runId, steps);
}

void (async () => {
  // await main();

  await updateRunLongTermThoughts('9Eu80GJttvrbu1S5ieAn', 500);

  console.log('Done!');
  exit(0);
})();
