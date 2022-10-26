import { swapKeyValue, withoutUndefinedValues } from '../utils';

test('swapKeyValue', () => {
  expect(swapKeyValue({ a: 1, b: 2 })).toEqual({ 1: 'a', 2: 'b' });
});

test('withoutUndefinedValues', () => {
  expect(withoutUndefinedValues({ a: 1, b: undefined, c: null })).toEqual({
    a: 1,
    c: null,
  });
});
