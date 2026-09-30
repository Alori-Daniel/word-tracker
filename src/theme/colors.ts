type SemanticTone = {
  readonly foreground: string;
  readonly background: string;
};

export type AppColors = {
  readonly background: {
    readonly canvas: string;
    readonly surface: string;
    readonly elevated: string;
    readonly muted: string;
  };
  readonly content: {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly inverse: string;
    readonly disabled: string;
  };
  readonly border: {
    readonly subtle: string;
    readonly default: string;
    readonly strong: string;
  };
  readonly brand: {
    readonly primary: string;
    readonly pressed: string;
    readonly soft: string;
    readonly onPrimary: string;
  };
  readonly semantic: {
    readonly success: SemanticTone;
    readonly warning: SemanticTone;
    readonly error: SemanticTone;
    readonly info: SemanticTone;
  };
  readonly learningStatus: {
    readonly learning: SemanticTone;
    readonly familiar: SemanticTone;
    readonly mastered: SemanticTone;
  };
  readonly overlay: {
    readonly scrim: string;
    readonly shadow: string;
  };
};

export const lightColors = {
  background: {
    canvas: '#F5F3ED',
    surface: '#FFFEFA',
    elevated: '#FFFFFF',
    muted: '#ECE9E1',
  },
  content: {
    primary: '#17191D',
    secondary: '#555A64',
    tertiary: '#7B808B',
    inverse: '#FFFFFF',
    disabled: '#A8ACB5',
  },
  border: {
    subtle: '#E5E1D8',
    default: '#D2CDC2',
    strong: '#858177',
  },
  brand: {
    primary: '#0878B8',
    pressed: '#065F93',
    soft: '#E2F1FA',
    onPrimary: '#FFFFFF',
  },
  semantic: {
    success: { foreground: '#176641', background: '#DDF3E7' },
    warning: { foreground: '#7A5411', background: '#FBEDC9' },
    error: { foreground: '#9A3535', background: '#F9E2E2' },
    info: { foreground: '#086A9F', background: '#E1F1FA' },
  },
  learningStatus: {
    learning: { foreground: '#8A5B0B', background: '#FFF1CC' },
    familiar: { foreground: '#315F93', background: '#E2EDF9' },
    mastered: { foreground: '#206744', background: '#DDF2E7' },
  },
  overlay: {
    scrim: '#10171366',
    shadow: '#16201929',
  },
} as const satisfies AppColors;

export const darkColors = {
  background: {
    canvas: '#10141C',
    surface: '#181E29',
    elevated: '#202837',
    muted: '#273142',
  },
  content: {
    primary: '#F3F4F7',
    secondary: '#B8BBC4',
    tertiary: '#8B909C',
    inverse: '#0B162A',
    disabled: '#626772',
  },
  border: {
    subtle: '#293345',
    default: '#3A475D',
    strong: '#68758A',
  },
  brand: {
    primary: '#8FB2FF',
    pressed: '#A9C5FF',
    soft: '#34415E',
    onPrimary: '#0B162A',
  },
  semantic: {
    success: { foreground: '#86DBAD', background: '#173A29' },
    warning: { foreground: '#F1CD78', background: '#403418' },
    error: { foreground: '#F2A5A8', background: '#442527' },
    info: { foreground: '#9EC0FF', background: '#253552' },
  },
  learningStatus: {
    learning: { foreground: '#EDC86F', background: '#3D3319' },
    familiar: { foreground: '#9EC0FF', background: '#263653' },
    mastered: { foreground: '#89DCAF', background: '#193B2B' },
  },
  overlay: {
    scrim: '#00000099',
    shadow: '#00000080',
  },
} as const satisfies AppColors;
