import { matchCommands, isSlashCommand, slashCommands } from './slashCommands';

describe('slashCommands', () => {
  describe('matchCommands', () => {
    it('returns all commands for "/" prefix', () => {
      expect(matchCommands('/')).toEqual(slashCommands);
    });

    it('filters commands by partial match', () => {
      const matches = matchCommands('/cl');
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('/clear');
    });

    it('returns empty for non-slash input', () => {
      expect(matchCommands('hello')).toEqual([]);
    });

    it('returns empty for empty input', () => {
      expect(matchCommands('')).toEqual([]);
    });

    it('is case-insensitive', () => {
      const matches = matchCommands('/CL');
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('/clear');
    });

    it('matches multiple commands with shared prefix', () => {
      // /new and /export don't share a prefix, but /e matches /export
      const matches = matchCommands('/e');
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('/export');
    });
  });

  describe('isSlashCommand', () => {
    it('recognizes exact command', () => {
      const cmd = isSlashCommand('/clear');
      expect(cmd).not.toBeNull();
      expect(cmd?.name).toBe('/clear');
    });

    it('is case-insensitive', () => {
      const cmd = isSlashCommand('/CLEAR');
      expect(cmd).not.toBeNull();
    });

    it('trims whitespace', () => {
      const cmd = isSlashCommand('  /clear  ');
      expect(cmd).not.toBeNull();
    });

    it('returns null for partial command', () => {
      expect(isSlashCommand('/cle')).toBeNull();
    });

    it('returns null for non-command text', () => {
      expect(isSlashCommand('hello')).toBeNull();
    });
  });
});
