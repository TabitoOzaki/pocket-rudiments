import { memo, type ReactElement } from 'react';
import {
  G, Line, Ellipse, Path, Text,
} from 'react-native-svg';
import type {
  BeamGroup, Measure, RudimentNote, TimeSignature,
} from '@/types/rudiment';
import { beamCount, graceHands, tremoloHands } from '@/core/rudiments/hands';
import { flattenNotes } from '@/core/rudiments/parse';
import type { MeasureLayout } from '@/core/render/layout';
import {
  AccentMark, Barline, Beam, BRAVURA_SIZE, BuzzMark, Flag, HAND_COLORS, HEAD_TILT, INK,
  LINE_Y, NoteHead, RepeatBar, RestSymbol, SPACE, STEM_W, STEM_X_OFF, STEM_Y_TOP, Stem,
  Tie, TremoloSlashes, smuflTimeSigDigits,
} from './shared';

const GRACE_RX = 4.3;
const GRACE_RY = 3.1;
const GRACE_STEM_X = 3.6;
const GRACE_STEM_TOP = LINE_Y - 26;
/** 装飾音の符頭と主音の距離 */
const GRACE_STEP = 12;

const STICKING_Y = LINE_Y + 37;
const STUB_W = 8;

/** 連桁の 2 段目以降で、1 音だけ離れている音符の部分桁を左右どちらへ出すか */
const stubDirection = (notes: RudimentNote[], index: number): 'left' | 'right' => {
  if (index === notes.length - 1) return 'left';
  if (index === 0) return 'right';
  // 付点の後ろの短い音符は前へつなげる
  return notes[index - 1].dotted ? 'left' : 'right';
};

function GraceNotes({ note, x }: { note: RudimentNote; x: number }) {
  const count = graceHands(note).length;
  if (count === 0) return null;
  const xs = Array.from({ length: count }, (_, index) => x - GRACE_STEP * (count - index) - 7);
  const stemXs = xs.map((gx) => gx + GRACE_STEM_X);
  return (
    <G>
      {xs.map((gx) => (
        <G key={gx}>
          <Ellipse
            cx={gx}
            cy={LINE_Y}
            rx={GRACE_RX}
            ry={GRACE_RY}
            fill={INK}
            rotation={HEAD_TILT}
            originX={gx}
            originY={LINE_Y}
          />
          <Line
            x1={gx + GRACE_STEM_X}
            y1={LINE_Y}
            x2={gx + GRACE_STEM_X}
            y2={GRACE_STEM_TOP}
            stroke={INK}
            strokeWidth={1}
          />
        </G>
      ))}
      {note.grace === 'flam' && (
        <G>
          <Path
            d={`M ${stemXs[0]} ${GRACE_STEM_TOP} C ${stemXs[0] + 1} ${GRACE_STEM_TOP + 5} ${stemXs[0] + 7} ${GRACE_STEM_TOP + 7} ${stemXs[0] + 5} ${GRACE_STEM_TOP + 14}`}
            fill="none"
            stroke={INK}
            strokeWidth={1.2}
          />
          <Line
            x1={stemXs[0] - 4}
            y1={GRACE_STEM_TOP + 14}
            x2={stemXs[0] + 6}
            y2={GRACE_STEM_TOP + 6}
            stroke={INK}
            strokeWidth={1}
          />
        </G>
      )}
      {note.grace === 'drag' && [0, 4.5].map((offset) => (
        <Line
          key={offset}
          x1={stemXs[0] - 0.5}
          y1={GRACE_STEM_TOP + offset + 1.2}
          x2={stemXs[stemXs.length - 1] + 0.5}
          y2={GRACE_STEM_TOP + offset + 1.2}
          stroke={INK}
          strokeWidth={2.4}
        />
      ))}
      <Tie x1={xs[0] - 3} x2={x} />
    </G>
  );
}

function NoteBody({
  note, x, beamed, notationFont,
}: { note: RudimentNote; x: number; beamed: boolean; notationFont: string }) {
  if (note.isRest) return <RestSymbol x={x} value={note.value} notationFont={notationFont} />;
  const flags = beamed ? 0 : beamCount(note);
  return (
    <G>
      <NoteHead cx={x} filled={note.value !== 2} />
      <Stem cx={x} top={beamed ? STEM_Y_TOP + 1 : STEM_Y_TOP} />
      {flags > 0 && <Flag cx={x} flagCount={flags} notationFont={notationFont} />}
      {note.dotted && <Ellipse cx={x + 13} cy={LINE_Y - 6} rx={2} ry={2} fill={INK} />}
      {note.tremolo > 0 && <TremoloSlashes cx={x} count={note.tremolo} />}
      {note.buzz && <BuzzMark cx={x} />}
      {note.accent && <AccentMark cx={x} />}
      <GraceNotes note={note} x={x} />
    </G>
  );
}

function Beams({ notes, xs }: { notes: RudimentNote[]; xs: number[] }) {
  const stemX = (index: number) => xs[index] + STEM_X_OFF;
  const maxLevel = Math.max(...notes.map(beamCount));
  const beams: ReactElement[] = [
    <Beam key="primary" x1={stemX(0) - STEM_W / 2} x2={stemX(notes.length - 1) + STEM_W / 2} level={1} />,
  ];
  for (let level = 2; level <= maxLevel; level += 1) {
    let runStart = -1;
    for (let index = 0; index <= notes.length; index += 1) {
      const note = notes[index];
      const inRun = note !== undefined && !note.isRest && beamCount(note) >= level;
      if (inRun && runStart < 0) runStart = index;
      if (!inRun && runStart >= 0) {
        const runEnd = index - 1;
        let x1 = stemX(runStart) - STEM_W / 2;
        let x2 = stemX(runEnd) + STEM_W / 2;
        if (runStart === runEnd) {
          if (stubDirection(notes, runStart) === 'left') {
            x1 -= STUB_W;
          } else {
            x2 += STUB_W;
          }
        }
        beams.push(<Beam key={`${level}-${runStart}`} x1={x1} x2={x2} level={level} />);
        runStart = -1;
      }
    }
  }
  return <G>{beams}</G>;
}

function TupletLabels({ group, xs }: { group: BeamGroup; xs: number[] }) {
  return (
    <G>
      {group.tuplets.map((tuplet) => {
        const center = (xs[tuplet.from] + xs[tuplet.to]) / 2 + STEM_X_OFF;
        return (
          <Text
            key={tuplet.from}
            x={center}
            y={STEM_Y_TOP - 5}
            fontSize={14}
            fontWeight="bold"
            fontStyle="italic"
            textAnchor="middle"
            fill={INK}
          >
            {tuplet.label}
          </Text>
        );
      })}
    </G>
  );
}

function StickingLabel({ note, x }: { note: RudimentNote; x: number }) {
  if (note.isRest) return null;
  const strokes = tremoloHands(note);
  // 2 打のダブル（斜線 1 本の 16 分など）は PAS 譜面と同じく "RR" と書く
  const main = strokes.length === 2 ? `${note.hand}${note.hand}` : note.hand;
  const graces = graceHands(note);
  return (
    <G>
      {graces.map((hand, index) => (
        <Text
          key={index}
          x={x - GRACE_STEP * (graces.length - index) - 7}
          y={STICKING_Y}
          fontSize={10.5}
          fontWeight="bold"
          textAnchor="middle"
          fill={HAND_COLORS[hand]}
        >
          {hand}
        </Text>
      ))}
      <Text
        x={x}
        y={STICKING_Y}
        fontSize={main.length > 1 ? 13 : 15}
        fontWeight="bold"
        textAnchor="middle"
        fill={HAND_COLORS[note.hand]}
      >
        {main}
      </Text>
    </G>
  );
}

interface MeasureViewProps {
  measure: Measure;
  layout: MeasureLayout;
  left: number;
  right: number;
  repeatStart: boolean;
  repeatEnd: boolean;
  timeSignature: TimeSignature | null;
  notationFont: string;
}

function MeasureView({
  measure, layout, left, right, repeatStart, repeatEnd, timeSignature, notationFont,
}: MeasureViewProps) {
  const notes = flattenNotes(measure);
  let offset = 0;
  const groupXs = measure.groups.map((group) => {
    const xs = layout.noteX.slice(offset, offset + group.notes.length);
    offset += group.notes.length;
    return xs;
  });

  return (
    <G>
      <Line x1={left} y1={LINE_Y} x2={right} y2={LINE_Y} stroke={INK} strokeWidth={1} />
      {repeatStart && <RepeatBar x={left} side="start" />}
      {timeSignature && (
        <G>
          {[
            { value: timeSignature.numerator, y: LINE_Y - SPACE },
            { value: timeSignature.denominator, y: LINE_Y + SPACE },
          ].map(({ value, y }) => (
            <Text
              key={y}
              x={left + (repeatStart ? 30 : 12)}
              y={y}
              fontSize={BRAVURA_SIZE}
              fontFamily={notationFont}
              textAnchor="middle"
              fill={INK}
            >
              {smuflTimeSigDigits(value)}
            </Text>
          ))}
        </G>
      )}
      {repeatEnd ? <RepeatBar x={right} side="end" /> : <Barline x={right} />}

      {measure.groups.map((group, groupIndex) => {
        const xs = groupXs[groupIndex];
        const beamed = group.notes.length > 1;
        return (
          <G key={groupIndex}>
            {group.notes.map((note, index) => (
              <NoteBody
                key={index}
                note={note}
                x={xs[index]}
                beamed={beamed}
                notationFont={notationFont}
              />
            ))}
            {beamed && <Beams notes={group.notes} xs={xs} />}
            <TupletLabels group={group} xs={xs} />
          </G>
        );
      })}

      {measure.rolls.map((roll) => {
        const x1 = layout.noteX[roll.from];
        const x2 = layout.noteX[roll.to];
        return (
          <G key={roll.from}>
            <Text
              x={(x1 + x2) / 2 + STEM_X_OFF}
              y={STEM_Y_TOP - 8}
              fontSize={14}
              fontWeight="bold"
              fontStyle="italic"
              textAnchor="middle"
              fill={INK}
            >
              {roll.label}
            </Text>
            <Tie x1={x1} x2={x2} />
          </G>
        );
      })}

      {notes.map((note, index) => (
        <StickingLabel key={index} note={note} x={layout.noteX[index]} />
      ))}
    </G>
  );
}

export default memo(MeasureView);
