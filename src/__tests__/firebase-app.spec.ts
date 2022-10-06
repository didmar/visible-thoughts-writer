import { mergeStepsWithUpdates, Step } from '../firebase-app';

test('mergeStepsWithUpdates', () => {
  const s123: Step[] = [new Step(1), new Step(2), new Step(3)];
  const s4: Step[] = [new Step(4)];
  const s456: Step[] = [new Step(4), new Step(5), new Step(6)];
  const s645: Step[] = [new Step(6), new Step(4), new Step(5)];
  const s1up: Step[] = [new Step(1, [])];
  const s3up: Step[] = [new Step(3, [])];
  const s4up: Step[] = [new Step(4, [])];
  const s1up23: Step[] = [new Step(1, []), new Step(2), new Step(3)];
  const s123up: Step[] = [new Step(1), new Step(2), new Step(3, [])];
  const s1234up: Step[] = [
    new Step(1),
    new Step(2),
    new Step(3),
    new Step(4, []),
  ];

  expect(mergeStepsWithUpdates([], { added: [], modified: [] })).toEqual({
    merged: [],
    lastStepModified: false,
  });

  expect(
    mergeStepsWithUpdates(undefined, { added: s123, modified: [] })
  ).toEqual({
    merged: s123,
    lastStepModified: false,
  });

  expect(
    mergeStepsWithUpdates(undefined, { added: [], modified: s123 })
  ).toEqual({
    merged: s123,
    lastStepModified: false,
  });

  expect(mergeStepsWithUpdates(s123, { added: [], modified: [] })).toEqual({
    merged: s123,
    lastStepModified: false,
  });

  expect(mergeStepsWithUpdates(s123, { added: s456, modified: [] })).toEqual({
    merged: [...s123, ...s456],
    lastStepModified: false,
  });

  // Result will be sorted
  expect(mergeStepsWithUpdates(s456, { added: s123, modified: [] })).toEqual({
    merged: [...s123, ...s456],
    lastStepModified: false,
  });
  expect(mergeStepsWithUpdates(s456, { added: [], modified: s123 })).toEqual({
    merged: [...s123, ...s456],
    lastStepModified: false,
  });
  expect(mergeStepsWithUpdates(s123, { added: s645, modified: [] })).toEqual({
    merged: [...s123, ...s456],
    lastStepModified: false,
  });

  expect(mergeStepsWithUpdates(s123, { added: [], modified: s1up })).toEqual({
    merged: s1up23,
    lastStepModified: false,
  });

  expect(mergeStepsWithUpdates(s123, { added: [], modified: s3up })).toEqual({
    merged: s123up,
    lastStepModified: true,
  });

  expect(mergeStepsWithUpdates(s123, { added: s4, modified: s4up })).toEqual({
    merged: s1234up,
    lastStepModified: true,
  });
});
