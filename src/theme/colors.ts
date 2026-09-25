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
    canvas: '#F5F7F4',
    surface: '#FFFFFF',
    elevated: '#FBFCFA',
    muted: '#EDF1ED',
  },
  content: {
    primary: '#17211B',
    secondary: '#526158',
    tertiary: '#76827B',
    inverse: '#F8FBF9',
    disabled: '#A5AEA8',
  },
  border: {
    subtle: '#E5E9E5',
    default: '#CDD5CF',
    strong: '#87958B',
  },
  brand: {
    primary: '#2E6A4F',
    pressed: '#23563F',
    soft: '#E0F0E7',
    onPrimary: '#FFFFFF',
  },
  semantic: {
    success: { foreground: '#17633C', background: '#DDF2E6' },
    warning: { foreground: '#7A5411', background: '#FBEDC9' },
    error: { foreground: '#9A3535', background: '#F9E2E2' },
    info: { foreground: '#295F89', background: '#E0EDF7' },
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
    canvas: '#0E1511',
    surface: '#171F1A',
    elevated: '#1E2822',
    muted: '#26312A',
  },
  content: {
    primary: '#EDF4EF',
    secondary: '#B9C5BD',
    tertiary: '#8F9D94',
    inverse: '#142019',
    disabled: '#66736A',
  },
  border: {
    subtle: '#27322B',
    default: '#3B4940',
    strong: '#69786E',
  },
  brand: {
    primary: '#73C79A',
    pressed: '#8AD7AB',
    soft: '#1C3A2B',
    onPrimary: '#102318',
  },
  semantic: {
    success: { foreground: '#89DDAE', background: '#173A28' },
    warning: { foreground: '#F0CB73', background: '#403317' },
    error: { foreground: '#F0A0A0', background: '#442323' },
    info: { foreground: '#9AC7EC', background: '#1D3446' },
  },
  learningStatus: {
    learning: { foreground: '#EDC56B', background: '#3E3216' },
    familiar: { foreground: '#9EC8F2', background: '#1E354B' },
    mastered: { foreground: '#8BDBAF', background: '#183B29' },
  },
  overlay: {
    scrim: '#00000099',
    shadow: '#00000066',
  },
} as const satisfies AppColors;
