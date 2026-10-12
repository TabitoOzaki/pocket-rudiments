/**
 * assets/ の素材を読み込む窓口。
 * Metro は require() の引数を静的に解析して素材を同梱するため、素材の require はこのファイルにまとめる
 * （.eslintrc.js でこのファイルだけ global-require を無効にしている）。
 */

/** 記譜フォント（useFonts で登録する） */
export const NOTATION_FONTS: Record<string, number> = {
  Bravura: require('@assets/fonts/Bravura.otf'),
};

/** スネアの見本演奏に使うドラム音源 */
export const DRUM_SOUND_FONT: number = require('@assets/drums.sf2');
