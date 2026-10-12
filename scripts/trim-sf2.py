#!/usr/bin/env python3
"""
SF2 から 1 つのプリセットの指定ノートだけを抜き出した軽量な SF2 を作る。

アプリが鳴らすのは Jazz キット（バンク 128 / プログラム 32）のスネア（ノート 38）だけなので、
GeneralUser GS 全体（約 31MB）からその音に必要なサンプルだけを残す。

使い方:
  python3 scripts/trim-sf2.py <元の sf2> <出力先> [--bank 128] [--preset 32] [--notes 38]
"""
import argparse
import struct

GEN_INSTRUMENT = 41
GEN_KEY_RANGE = 43
GEN_SAMPLE_ID = 53
# SF2 の仕様で各サンプルの後ろに必要な無音のサンプル数
SAMPLE_PAD = 46


def read_chunks(buf, start, end):
    chunks = {}
    offset = start
    while offset < end:
        chunk_id = buf[offset:offset + 4].decode('latin1')
        size = struct.unpack('<I', buf[offset + 4:offset + 8])[0]
        body = buf[offset + 8:offset + 8 + size]
        if chunk_id == 'LIST':
            chunks[body[:4].decode('latin1')] = body
        else:
            chunks[chunk_id] = body
        offset += 8 + size + (size & 1)
    return chunks


def records(data, size, fmt):
    return [struct.unpack(fmt, data[i:i + size]) for i in range(0, len(data), size)]


def chunk(chunk_id, body):
    pad = b'\0' if len(body) & 1 else b''
    return chunk_id.encode('latin1') + struct.pack('<I', len(body)) + body + pad


def list_chunk(list_type, parts):
    return chunk('LIST', list_type.encode('latin1') + b''.join(parts))


def key_range_covers(gens, notes):
    for oper, amount in gens:
        if oper == GEN_KEY_RANGE:
            low, high = amount & 0xFF, amount >> 8
            return any(low <= note <= high for note in notes)
    return True


def zones(bags, gens, mods, first, last):
    """[first, last) の bag をそれぞれ (generators, modulators) に分ける"""
    result = []
    for bag in range(first, last):
        gen_start, mod_start = bags[bag]
        gen_end, mod_end = bags[bag + 1]
        result.append((gens[gen_start:gen_end], mods[mod_start:mod_end]))
    return result


def build_bags(zone_list):
    """zones を bag / gen / mod の配列に戻す（末尾の終端レコード付き）"""
    bags, gens, mods = [], [], []
    for zone_gens, zone_mods in zone_list:
        bags.append((len(gens), len(mods)))
        gens.extend(zone_gens)
        mods.extend(zone_mods)
    bags.append((len(gens), len(mods)))
    gens.append((0, 0))
    mods.append((0, 0, 0, 0, 0))
    return bags, gens, mods


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('output')
    parser.add_argument('--bank', type=int, default=128)
    parser.add_argument('--preset', type=int, default=32)
    parser.add_argument('--notes', type=int, nargs='+', default=[38])
    args = parser.parse_args()

    buf = open(args.source, 'rb').read()
    top = read_chunks(buf, 12, len(buf))
    info = top['INFO']
    smpl = read_chunks(top['sdta'], 4, len(top['sdta']))['smpl']
    pdta = read_chunks(top['pdta'], 4, len(top['pdta']))

    phdr = records(pdta['phdr'], 38, '<20sHHHIII')
    pbag = records(pdta['pbag'], 4, '<HH')
    pmod = records(pdta['pmod'], 10, '<HHhHH')
    pgen = records(pdta['pgen'], 4, '<HH')
    inst = records(pdta['inst'], 22, '<20sH')
    ibag = records(pdta['ibag'], 4, '<HH')
    imod = records(pdta['imod'], 10, '<HHhHH')
    igen = records(pdta['igen'], 4, '<HH')
    shdr = records(pdta['shdr'], 46, '<20sIIIIIBbHH')

    index = next(i for i, p in enumerate(phdr[:-1])
                 if p[1] == args.preset and p[2] == args.bank)
    preset = phdr[index]
    preset_zones = zones(pbag, pgen, pmod, preset[3], phdr[index + 1][3])

    sample_map = {}

    def keep_instrument(inst_id):
        """楽器のゾーンを対象ノートを含むものに絞る。サンプルが残らなければ None"""
        kept = []
        has_sample = False
        for zone_gens, zone_mods in zones(ibag, igen, imod, inst[inst_id][1], inst[inst_id + 1][1]):
            sample_id = next((amount for oper, amount in zone_gens if oper == GEN_SAMPLE_ID), None)
            if sample_id is None:
                kept.append((zone_gens, zone_mods))
                continue
            if not key_range_covers(zone_gens, args.notes):
                continue
            has_sample = True
            sample_map.setdefault(sample_id, len(sample_map))
            # ステレオの相方も一緒に持っていく
            link = shdr[sample_id][8]
            if shdr[sample_id][9] in (2, 4) and link < len(shdr) - 1:
                sample_map.setdefault(link, len(sample_map))
            kept.append((
                [(oper, sample_map[sample_id] if oper == GEN_SAMPLE_ID else amount)
                 for oper, amount in zone_gens],
                zone_mods,
            ))
        return kept if has_sample else None

    # プリセットのゾーンのうち、対象ノートを鳴らすもの（とグローバルゾーン）だけ残す
    kept_preset_zones = []
    inst_map = {}
    new_insts = []
    for zone_gens, zone_mods in preset_zones:
        inst_id = next((amount for oper, amount in zone_gens if oper == GEN_INSTRUMENT), None)
        if inst_id is None:
            kept_preset_zones.append((zone_gens, zone_mods))
            continue
        if not key_range_covers(zone_gens, args.notes):
            continue
        if inst_id not in inst_map:
            kept = keep_instrument(inst_id)
            if kept is None:
                continue
            inst_map[inst_id] = len(new_insts)
            new_insts.append((inst[inst_id][0], kept))
        kept_preset_zones.append((
            [(oper, inst_map[inst_id] if oper == GEN_INSTRUMENT else amount)
             for oper, amount in zone_gens],
            zone_mods,
        ))

    # サンプルデータを詰め直す
    new_smpl = bytearray()
    new_shdr = []
    for old_id in sorted(sample_map, key=sample_map.get):
        name, start, end, loop_start, loop_end, rate, pitch, correction, link, kind = shdr[old_id]
        base = len(new_smpl) // 2
        new_smpl += smpl[start * 2:end * 2] + b'\0' * (SAMPLE_PAD * 2)
        new_link = sample_map.get(link, 0) if kind in (2, 4) else 0
        new_shdr.append((name, base, base + end - start, base + loop_start - start,
                         base + loop_end - start, rate, pitch, correction, new_link, kind))
    new_shdr.append((b'EOS', 0, 0, 0, 0, 0, 0, 0, 0, 0))

    # 楽器・プリセットのヘッダーと bag を組み立てる
    inst_bag_zones = []
    new_inst = []
    for name, kept in new_insts:
        new_inst.append((name, len(inst_bag_zones)))
        inst_bag_zones.extend(kept)
    new_inst.append((b'EOI', len(inst_bag_zones)))
    new_ibag, new_igen, new_imod = build_bags(inst_bag_zones)
    new_pbag, new_pgen, new_pmod = build_bags(kept_preset_zones)
    new_phdr = [
        (preset[0], preset[1], preset[2], 0, preset[4], preset[5], preset[6]),
        (b'EOP', 0, 0, len(kept_preset_zones), 0, 0, 0),
    ]

    def pack(fmt, rows):
        return b''.join(struct.pack(fmt, *row) for row in rows)

    pdta_parts = [
        chunk('phdr', pack('<20sHHHIII', new_phdr)),
        chunk('pbag', pack('<HH', new_pbag)),
        chunk('pmod', pack('<HHhHH', new_pmod)),
        chunk('pgen', pack('<HH', new_pgen)),
        chunk('inst', pack('<20sH', new_inst)),
        chunk('ibag', pack('<HH', new_ibag)),
        chunk('imod', pack('<HHhHH', new_imod)),
        chunk('igen', pack('<HH', new_igen)),
        chunk('shdr', pack('<20sIIIIIBbHH', new_shdr)),
    ]
    body = (b'sfbk'
            + chunk('LIST', b'INFO' + info[4:])
            + list_chunk('sdta', [chunk('smpl', bytes(new_smpl))])
            + list_chunk('pdta', pdta_parts))
    with open(args.output, 'wb') as out:
        out.write(b'RIFF' + struct.pack('<I', len(body)) + body)

    print(f'instruments: {len(new_insts)}, samples: {len(new_shdr) - 1}, '
          f'size: {(len(body) + 8) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
