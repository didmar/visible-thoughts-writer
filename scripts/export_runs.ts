/**
 * This script exports all runs from the database to JSON files.
 */
import { exit } from 'process';
import {
  Run,
  getRunUserProfiles,
  getRuns,
  getSteps,
} from '../src/firebase-app';
import { exportRun } from '../src/export';
import { slugify } from '../src/utils';
import fs from 'fs';

const dumpRun = async (run: Run): Promise<void> => {
  console.log(`Exporting run: ${run.title}`);
  const steps = await getSteps(run.id);
  console.log(`- Found ${steps.length} steps`);
  const userProfiles = await getRunUserProfiles(run);
  // console.log(`userProfiles: ${userProfiles}`);
  const exportedRun = exportRun(run, userProfiles, steps);
  // console.log(`exportedRun: ${JSON.stringify(exportedRun, null, 2)}`);
  const filename = slugify(run.title).slice(0, 229) + '-' + run.id;
  const filepath = `run_exports/${filename}.json`;
  // Write the run to a JSON file
  const data = JSON.stringify(exportedRun, null, 2);
  fs.writeFileSync(filepath, data);
  console.log(`Exported run to ${filepath}`);
};

async function main(): Promise<void> {
  // Get all run ids
  const runs: Run[] = await getRuns();
  // Print the number of runs
  console.log(`Found ${runs.length} runs`);

  // Create "run_exports" folder if it doesn't exist
  if (!fs.existsSync('run_exports')) {
    fs.mkdirSync('run_exports');
  }

  // For each run idx (0 to runs.size), export it to a JSON file
  for (let i = 0; i < runs.length; i++) {
    await dumpRun(runs[i]);
  }
}

void (async () => {
  await main();
  console.log('Done!');
  exit(0);
})();
