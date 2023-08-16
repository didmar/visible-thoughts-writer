import {
  slugify,
  swapKeyValue,
  withoutUndefinedValues,
  zipWithPrev,
} from '../utils';

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

describe('slugify', () => {
  it('should work', () => {
    expect(slugify('あHello-World!')).toEqual('hello_world');
    expect(slugify('Friends¿')).toEqual('friends');
    expect(slugify('The spear of obsidian blood.')).toEqual(
      'the_spear_of_obsidian_blood'
    );
  });
});
