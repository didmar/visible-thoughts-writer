import { exit } from 'process';
import {
  Step,
  addSteps,
  Bullet,
  Thought,
  skipInitT,
  skipPptAndPpptT,
  // updateRunLongTermThoughtsForStep,
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

function generateRandomStep(n: number, prevStep: Step | undefined): Step {
  const initT = skipInitT(prevStep) ? [] : randomThoughtsSection();
  const ppt = skipPptAndPpptT(prevStep)
    ? null
    : 'Lorem ipsum '.repeat(1 + Math.floor(Math.random() * 20));
  const ppptT = skipPptAndPpptT(prevStep) ? [] : randomThoughtsSection();
  const act = {
    txt: 'Lorem ipsum '.repeat(1 + Math.floor(Math.random() * 10)),
    ybr: Math.random() < 0.1,
  };
  const pactT = randomThoughtsSection();

  const out =
    act.ybr && Math.random() < 0.5
      ? null
      : {
          txt: 'Lorem ipsum '.repeat(1 + Math.floor(Math.random() * 10)),
          ybr: Math.random() < 0.1,
        };

  const step = new Step(n, initT, ppt, ppptT, act, pactT, out);
  return step;
}

async function main(): Promise<void> {
  const runId = '9Eu80GJttvrbu1S5ieAn';

  const steps: Step[] = [];
  let prevStep;
  for (let n = 1; n <= 50; n++) {
    const step = generateRandomStep(n, prevStep);
    steps.push(step);
    prevStep = step;
  }
  await addSteps(runId, steps);
}

void (async () => {
  await main();

  // await updateRunLongTermThoughts('9Eu80GJttvrbu1S5ieAn', 500);

  console.log('Done!');
  exit(0);
})();
