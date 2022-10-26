import { swapKeyValue, withoutUndefinedValues, zipWithPrev } from '../utils';

test('swapKeyValue', () => {
  expect(swapKeyValue({ a: 1, b: 2 })).toEqual({ 1: 'a', 2: 'b' });
});

test('withoutUndefinedValues', () => {
  expect(withoutUndefinedValues({ a: 1, b: undefined, c: null })).toEqual({
    a: 1,
    c: null,
  });
});

describe('zipWithPrev', () => {
  it('should work', () => {
    expect(zipWithPrev([1, 2, 3])).toEqual([
      [1, undefined],
      [2, 1],
      [3, 2],
    ]);
  });
  it('should work with an empty array', () => {
    expect(zipWithPrev([])).toEqual([]);
  });
});
