import { appendUniqueById, shuffleItems } from './practice-session';

describe('practice sessions', () => {
  it('shuffles a copy without changing the source list', () => {
    const source = ['one', 'two', 'three'];

    expect(shuffleItems(source, () => 0)).toEqual(['two', 'three', 'one']);
    expect(source).toEqual(['one', 'two', 'three']);
  });

  it('collects each missed item only once', () => {
    const word = { id: 'word-1', word: 'Ephemeral' };

    expect(appendUniqueById(appendUniqueById([], word), word)).toEqual([word]);
  });
});
