import { RUDIMENTS } from '@/core/rudiments/catalog';
import { VELOCITY, buildSnareLoop, loopBeatsOf } from '@/core/rudiments/schedule';

const byId = (id: number) => RUDIMENTS.find((item) => item.id === id)!;

describe('buildSnareLoop', () => {
  it('places paradiddle 16ths on quarter-beat positions with accents', () => {
    const hits = buildSnareLoop(byId(16), 120);
    expect(hits.map((hit) => hit.beat)).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]);
    expect(hits.map((hit) => hit.hand).join('')).toBe('RLRRLRLL');
    expect(hits[0].velocity).toBe(VELOCITY.accent);
    expect(hits[1].velocity).toBe(VELOCITY.tap);
  });

  it('plays flam grace notes just before the main stroke with the other hand', () => {
    const [grace, main] = buildSnareLoop(byId(20), 100);
    expect(grace).toMatchObject({ beat: 0, hand: 'L', velocity: VELOCITY.grace });
    expect(grace.sec).toBeLessThan(0);
    expect(main).toMatchObject({ beat: 0, sec: 0, hand: 'R' });
  });

  it('plays two drag grace notes in order', () => {
    const [first, second] = buildSnareLoop(byId(31), 100);
    expect(first.sec).toBeLessThan(second.sec);
    expect(second.sec).toBeLessThan(0);
  });

  it('expands rolls into double strokes', () => {
    const hits = buildSnareLoop(byId(7), 80);
    expect(hits.map((hit) => hit.hand).join('')).toBe('RRLLRLLRRL');
    expect(hits.slice(0, 5).map((hit) => hit.beat)).toEqual([0, 0.125, 0.25, 0.375, 0.5]);
  });

  it('counts 6/8 beats in dotted quarters', () => {
    const rudiment = byId(21);
    expect(loopBeatsOf(rudiment)).toBe(2);
    const mains = buildSnareLoop(rudiment, 60).filter((hit) => hit.sec === 0);
    expect(mains.map((hit) => hit.beat)).toEqual([0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3]);
  });

  it('keeps every hit inside the loop', () => {
    RUDIMENTS.forEach((rudiment) => {
      const loop = loopBeatsOf(rudiment);
      buildSnareLoop(rudiment, 200).forEach((hit) => {
        expect(hit.beat).toBeGreaterThanOrEqual(0);
        expect(hit.beat).toBeLessThan(loop);
        expect(hit.velocity).toBeGreaterThan(0);
        expect(hit.velocity).toBeLessThanOrEqual(127);
      });
    });
  });
});
