import { ThoughtType } from '../../../firebase-app';
import { parseThoughts } from '../utils';

describe('parseThoughts', () => {
  it('should parse empty text', () => {
    expect(parseThoughts('', false, ThoughtType.Watsonian)).toEqual([
      {
        type: 'thought',
        lt: false,
        thoughtType: ThoughtType.Watsonian,
        text: '',
      },
    ]);
  });
  it('should parse a single thought', () => {
    expect(parseThoughts('Test1', false, ThoughtType.Watsonian)).toEqual([
      {
        type: 'thought',
        lt: false,
        thoughtType: ThoughtType.Watsonian,
        text: 'Test1',
      },
    ]);
  });
  it('should parse a separator', () => {
    expect(parseThoughts('.', false, ThoughtType.Watsonian)).toEqual([
      {
        type: 'eot',
        text: '.',
      },
    ]);
  });
  it('should parse thoughts with separators', () => {
    expect(parseThoughts('Test1. Test2.', true, ThoughtType.Doylist)).toEqual([
      {
        type: 'thought',
        lt: true,
        thoughtType: ThoughtType.Doylist,
        text: 'Test1',
      },
      {
        type: 'eot',
        text: '.',
      },
      {
        type: 'thought',
        lt: true,
        thoughtType: ThoughtType.Doylist,
        text: ' Test2',
      },
      {
        type: 'eot',
        text: '.',
      },
    ]);
  });
});
