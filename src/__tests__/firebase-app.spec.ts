import { mergeStepsWithUpdates, Step } from '../firebase-app';

test('mergeStepsWithUpdates', () => {
  const s123: Step[] = [new Step(1), new Step(2), new Step(3)];
  const s456: Step[] = [new Step(4), new Step(5), new Step(6)];
  const s1up: Step[] = [new Step(1, [])];
  const s641up5: Step[] = [
    new Step(6),
    new Step(4),
    new Step(1, []),
    new Step(5),
  ];

  expect(mergeStepsWithUpdates([], [])).toEqual([]);
  expect(mergeStepsWithUpdates(undefined, s123)).toEqual(s123);
  expect(mergeStepsWithUpdates(s123, [])).toEqual(s123);
  expect(mergeStepsWithUpdates(s123, s456)).toEqual([...s123, ...s456]);
  // Order is preserved
  expect(mergeStepsWithUpdates(s456, s123)).toEqual([...s123, ...s456]);
  expect(mergeStepsWithUpdates(s123, s1up)).toEqual([
    new Step(1, []),
    new Step(2),
    new Step(3),
  ]);
  expect(mergeStepsWithUpdates(s1up, s123)).toEqual(s123);
  // Initial order does not matter, result will be sorted
  expect(mergeStepsWithUpdates(s123, s641up5)).toEqual([
    new Step(1, []),
    new Step(2),
    new Step(3),
    new Step(4),
    new Step(5),
    new Step(6),
  ]);
});
