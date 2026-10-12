import { RUDIMENTS } from '@/core/rudiments/catalog';
import { layoutMeasure, minMeasureWidth, MIN_NOTE_GAP } from '@/core/render/layout';

const find = (id: number) => {
  const rudiment = RUDIMENTS.find((item) => item.id === id);
  if (!rudiment) throw new Error(String(id));
  return rudiment;
};

describe('layoutMeasure', () => {
  it('keeps the minimum gap between notes when the measure is wide enough', () => {
    RUDIMENTS.forEach((rudiment) => {
      const ticks = rudiment.beatTicks * rudiment.beatsPerMeasure;
      rudiment.measures.forEach((measure) => {
        const width = minMeasureWidth(measure, ticks);
        const { noteX } = layoutMeasure(measure, ticks, 0, width);
        noteX.slice(1).forEach((x, i) => {
          expect(x - noteX[i]).toBeGreaterThanOrEqual(MIN_NOTE_GAP - 1e-6);
        });
      });
    });
  });

  it('places a beat that falls inside a long note between its neighbours', () => {
    const rudiment = find(15);
    const ticks = rudiment.beatTicks * rudiment.beatsPerMeasure;
    const { tickX } = layoutMeasure(rudiment.measures[0], ticks, 0, 300);
    expect(tickX(0)).toBe(0);
    expect(tickX(48)).toBeGreaterThan(tickX(0));
    expect(tickX(96)).toBeGreaterThan(tickX(48));
    expect(tickX(ticks)).toBe(300);
  });
});
