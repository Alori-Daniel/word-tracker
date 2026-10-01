import { InvalidCsvError, parseVocabularyCsv } from './vocabulary-csv-parser';

describe('parseVocabularyCsv', () => {
  it('parses exported columns, quoted commas, and pipe-separated lists', () => {
    const result = parseVocabularyCsv(
      '\uFEFFword,meaning,category,learning_status,favorite,synonyms,examples\r\n' +
        'Ephemeral,"Lasting a short time, briefly.",Literature,familiar,true,"brief | fleeting","It was brief. | It faded."',
    );

    expect(result.issues).toEqual([]);
    expect(result.records).toEqual([
      expect.objectContaining({
        categoryName: 'Literature',
        rowNumber: 2,
        input: expect.objectContaining({
          definition: 'Lasting a short time, briefly.',
          examples: ['It was brief.', 'It faded.'],
          isFavorite: true,
          status: 'familiar',
          synonyms: ['brief', 'fleeting'],
          word: 'Ephemeral',
        }),
      }),
    ]);
  });

  it('reports invalid rows and skips repeated words in the same file', () => {
    const result = parseVocabularyCsv(
      'word,meaning,learning_status,favorite\nNovel,A new work,learning,false\nnovel,Again,learning,false\nMissing,,unknown,yes',
    );

    expect(result.records).toHaveLength(1);
    expect(result.duplicateRows).toEqual([3]);
    expect(result.issues).toEqual([{ rowNumber: 4, message: 'Meaning is required.' }]);
  });

  it('requires word and meaning headers', () => {
    expect(() => parseVocabularyCsv('term,description\nword,meaning')).toThrow(InvalidCsvError);
  });

  it('supports newlines and escaped quotes inside quoted values', () => {
    const result = parseVocabularyCsv('word,meaning\nNovel,"A ""new""\nidea"');
    expect(result.records[0]?.input.definition).toBe('A "new"\nidea');
  });
});
