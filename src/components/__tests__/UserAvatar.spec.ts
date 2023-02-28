import { stringAvatar } from '../UserAvatar';

test('stringAvatar', () => {
  expect(stringAvatar('John Doe')).toEqual({
    children: 'JD',
    sx: {
      bgcolor: '#a55c80',
    },
  });
  expect(stringAvatar('john')).toEqual({
    children: 'J',
    sx: {
      bgcolor: '#0bdd31',
    },
  });
  expect(stringAvatar('John Wayne Doe')).toEqual({
    children: 'JW',
    sx: {
      bgcolor: '#0bea43',
    },
  });
  expect(stringAvatar('')).toEqual({
    children: 'A',
    sx: {
      bgcolor: '#4d9486',
    },
  });
  expect(stringAvatar('?! -')).toEqual({
    children: '?-',
    sx: {
      bgcolor: '#4f231d',
    },
  });
});
