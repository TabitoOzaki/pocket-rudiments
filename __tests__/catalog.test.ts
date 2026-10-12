import { RUDIMENTS } from '@/core/rudiments/catalog';
import { graceHands, swapHands, tremoloHands } from '@/core/rudiments/hands';
import { flattenNotes, measureTicks, parseMeasure } from '@/core/rudiments/parse';
import type { Rudiment } from '@/types/rudiment';

/** 装飾音を小文字にした手順の文字列（PAS 譜面の表記と同じ並び） */
const sticking = (rudiment: Rudiment): string => rudiment.measures
  .flatMap(flattenNotes)
  .filter((note) => !note.isRest)
  .map((note) => graceHands(note).join('').toLowerCase() + tremoloHands(note).join(''))
  .join(' ');

const byId = (id: number) => {
  const rudiment = RUDIMENTS.find((item) => item.id === id);
  if (!rudiment) throw new Error(`missing ${id}`);
  return rudiment;
};

describe('PAS 40 rudiments catalog', () => {
  it('has rudiments numbered 1 to 40 in order', () => {
    expect(RUDIMENTS.map((rudiment) => rudiment.id)).toEqual(
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
  });

  it('marks exactly the original 26', () => {
    expect(RUDIMENTS.filter((rudiment) => rudiment.isOriginal26)).toHaveLength(26);
  });

  it.each(RUDIMENTS.map((rudiment) => [rudiment.id, rudiment.name, rudiment] as const))(
    '%i %s fills every measure exactly',
    (_, __, rudiment) => {
      rudiment.measures.forEach((measure) => {
        expect(measureTicks(measure)).toBeCloseTo(rudiment.beatTicks * rudiment.beatsPerMeasure);
      });
    },
  );

  it('gives every stroke a hand', () => {
    RUDIMENTS.forEach((rudiment) => {
      rudiment.measures.flatMap(flattenNotes).forEach((note) => {
        if (!note.isRest) expect(['R', 'L']).toContain(note.hand);
      });
    });
  });

  it('matches roll stroke counts to their labels', () => {
    RUDIMENTS.forEach((rudiment) => {
      rudiment.measures.forEach((measure) => {
        const notes = flattenNotes(measure);
        measure.rolls.forEach((roll) => {
          const strokes = notes
            .slice(roll.from, roll.to + 1)
            .filter((note) => !note.isRest)
            .reduce((sum, note) => sum + tremoloHands(note).length, 0);
          expect(`${rudiment.name}: ${strokes}`).toBe(`${rudiment.name}: ${roll.label}`);
        });
      });
    });
  });

  it.each([
    [1, 'R L R L R L R L R L R L R L R L'],
    [5, 'R R R L L L R R R L L L'],
    [7, 'RRLL R LLRR L'],
    [8, 'R LLRR L R LLRR L'],
    [9, 'RRLLRR L LLRRLL R'],
    [10, 'RRLLRRLL R LLRRLLRR L'],
    [11, 'RRLLRRLL R L LLRRLLRR L R'],
    [12, 'RRLLRRLL RR L LLRRLLRR LL R'],
    [13, 'RRLLRRLL RRLL R LLRRLLRR LLRR L'],
    [14, 'RRLLRRLL RRLLRR L RRLLRRLL RRLLRR L'],
    [15, 'RRLLRRLLRRLLRRLL R LLRRLLRRLLRRLLRR L'],
    [16, 'R L R R L R L L'],
    [21, 'lR L R rL R L'],
    [23, 'lR L R L lR'],
    [27, 'lR L R rL lR L R rL'],
    [30, 'lR L L R rL R R L'],
    [31, 'llR rrL'],
    [33, 'llR llR L rrL rrL R'],
    [34, 'llR L R llR L R'],
    [35, 'RR L R R LL R L L'],
    [37, 'R llR llR L R R L rrL rrL R L L'],
    [38, 'llR L R L rrL R L R'],
    [39, 'llR llR L R L rrL rrL R L R'],
    [40, 'llR llR llR L R L rrL rrL rrL R L R'],
  ])('rudiment %i is sticked %s', (id, expected) => {
    expect(sticking(byId(id))).toBe(expected);
  });

  it('mirrors every hand for a left-hand lead', () => {
    expect(sticking(swapHands(byId(24)))).toBe('rL R L L lR L R R');
  });
});

describe('parseMeasure', () => {
  it('reads tuplets, beams and roll marks', () => {
    const measure = parseMeasure('{5 [ (3 16R 16L 16R ) 8L^ ] } 4R');
    expect(measure.groups).toHaveLength(2);
    expect(measure.groups[0].tuplets).toEqual([{ label: '3', from: 0, to: 2 }]);
    expect(measure.groups[0].notes.map((note) => note.ticks)).toEqual([8, 8, 8, 24]);
    expect(measure.groups[0].notes[3].accent).toBe(true);
    expect(measure.rolls).toEqual([{ label: '5', from: 0, to: 3 }]);
  });

  it('rejects unknown tokens', () => {
    expect(() => parseMeasure('[ 16X ]')).toThrow();
  });
});
