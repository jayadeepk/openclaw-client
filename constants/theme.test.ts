import { buildTheme, fontScales, fontSizeLabels } from './theme';

describe('theme - font size scaling', () => {
  it('medium produces default font sizes', () => {
    const theme = buildTheme('dark', 'medium');
    expect(theme.fontSize).toEqual({ sm: 13, md: 15, lg: 18, xl: 22 });
    expect(theme.fontSizeLabel).toBe('medium');
  });

  it('small scales down font sizes', () => {
    const theme = buildTheme('dark', 'small');
    expect(theme.fontSize.md).toBe(Math.round(15 * 0.85));
    expect(theme.fontSizeLabel).toBe('small');
  });

  it('large scales up font sizes', () => {
    const theme = buildTheme('dark', 'large');
    expect(theme.fontSize.md).toBe(Math.round(15 * 1.2));
  });

  it('extra-large scales up font sizes', () => {
    const theme = buildTheme('dark', 'extra-large');
    expect(theme.fontSize.md).toBe(Math.round(15 * 1.4));
  });

  it('defaults to medium when no font size provided', () => {
    const theme = buildTheme('dark');
    expect(theme.fontSize).toEqual({ sm: 13, md: 15, lg: 18, xl: 22 });
    expect(theme.fontSizeLabel).toBe('medium');
  });

  it('fontSizeLabels contains all four options', () => {
    expect(fontSizeLabels).toEqual(['small', 'medium', 'large', 'extra-large']);
  });

  it('fontScales has correct values', () => {
    expect(fontScales).toEqual({
      'small': 0.85,
      'medium': 1,
      'large': 1.2,
      'extra-large': 1.4,
    });
  });
});
