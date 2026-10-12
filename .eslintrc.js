module.exports = {
  root: true,
  extends: [
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
  ],
  parserOptions: {
    project: './tsconfig.json',
    warnOnUnsupportedTypeScriptVersion: false,
  },
  env: {
    'react-native/react-native': true,
  },
  plugins: [
    'react-native',
  ],
  settings: {
    'import/resolver': {
      // tsconfig の paths（@/ と @assets/）を解決する
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    // React 19 の新JSXトランスフォームでは各ファイルでの React import が不要
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    // .tsx を許可（airbnb はデフォルトで .jsx のみ許可）
    'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
    // React Native では DOM が存在しないため対象外
    'jsx-a11y/anchor-is-valid': 'off',
    // React Native のスタイル用途で色リテラルの直書きは許容する
    'react-native/no-color-literals': 'off',
    // インラインスタイルは本プロジェクトで多用しているため警告に留める
    'react-native/no-inline-styles': 'warn',
    // props の分割代入内でのデフォルト値指定を許容する（本プロジェクトの既存パターン）
    'react/require-default-props': 'off',
    'react/jsx-props-no-spreading': 'off',
    // styles を StyleSheet.create でファイル末尾にまとめる RN の慣習的な配置を許容する
    '@typescript-eslint/no-use-before-define': ['error', {
      functions: false,
      classes: true,
      variables: false,
    }],
    // 依存の向きを app → features → components / core → types に限定する
    'import/no-restricted-paths': ['error', {
      zones: [
        {
          target: './src/features',
          from: './src/app',
          message: 'features から app は参照しない',
        },
        {
          target: './src/components',
          from: ['./src/app', './src/features'],
          message: '共通コンポーネントは app・features に依存しない',
        },
        {
          target: './src/core',
          from: ['./src/app', './src/features', './src/components'],
          message: 'core は types 以外の src に依存しない（React Native 描画は core/render 内で完結させる）',
        },
        {
          target: './src/types',
          from: ['./src/app', './src/features', './src/components', './src/core'],
          message: 'types はどこにも依存しない',
        },
      ],
    }],
  },
  overrides: [
    {
      files: ['__tests__/**/*.ts', '__tests__/**/*.tsx'],
      env: {
        jest: true,
      },
    },
    {
      files: ['*.js'],
      parserOptions: {
        project: null,
      },
    },
    {
      // シード付き擬似乱数生成のためビット演算を意図的に使用している
      files: [
        'src/core/rhythm/random.ts',
        'src/core/notation/repeat.ts',
        'src/core/render/pdf/scoreHtml.ts',
        'src/core/render/native/RhythmStaff.tsx',
        'src/features/score/StaffScreen.tsx',
        '__tests__/helpers/fixtures.ts',
      ],
      rules: {
        'no-bitwise': 'off',
      },
    },
    {
      // 譜面の音符・小節・記号は位置順に描くだけで並べ替えや挿入が起きず、固有の ID もないため添字を key にする
      files: ['src/core/render/native/**/*.tsx'],
      rules: {
        'react/no-array-index-key': 'off',
      },
    },
    {
      // Metro が素材を同梱できるよう、素材の require() はこのファイルにまとめている
      files: ['src/assets.ts'],
      rules: {
        'global-require': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'modules/react-native-metronome/ios/',
    'modules/react-native-metronome/android/',
    'babel.config.js',
    'metro.config.js',
    '.eslintrc.js',
  ],
};
