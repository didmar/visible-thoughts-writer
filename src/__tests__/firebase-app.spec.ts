import { mergeStepsWithUpdates, Step } from '../firebase-app';

test('mergeStepsWithUpdates', () => {
  const sample1: Step[] = [new Step(1), new Step(2), new Step(3)];
  const sample2: Step[] = [new Step(4), new Step(5), new Step(6)];
  const sample3: Step[] = [new Step(1, [])];

  expect(mergeStepsWithUpdates([], [])).toEqual([]);
  expect(mergeStepsWithUpdates(undefined, sample1)).toEqual(sample1);
  expect(mergeStepsWithUpdates(sample1, [])).toEqual(sample1);
  expect(mergeStepsWithUpdates(sample1, sample2)).toEqual([
    ...sample1,
    ...sample2,
  ]);
  // Order is preserved
  expect(mergeStepsWithUpdates(sample2, sample1)).toEqual([
    ...sample1,
    ...sample2,
  ]);
  expect(mergeStepsWithUpdates(sample1, sample3)).toEqual([
    new Step(1, []),
    new Step(2),
    new Step(3),
  ]);
  expect(mergeStepsWithUpdates(sample3, sample1)).toEqual(sample1);
});
