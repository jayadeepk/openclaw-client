/** Slash command definition */
export interface SlashCommand {
  name: string;
  description: string;
}

/** Available slash commands */
export const slashCommands: SlashCommand[] = [
  { name: '/clear', description: 'Clear all messages' },
  { name: '/new', description: 'Start a new conversation' },
  { name: '/export', description: 'Export conversation as text' },
  { name: '/theme', description: 'Toggle dark/light mode' },
];

/** Return matching commands for a given input prefix */
export function matchCommands(input: string): SlashCommand[] {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.startsWith('/')) return [];
  return slashCommands.filter((cmd) => cmd.name.startsWith(trimmed));
}

/** Check if input is an exact slash command (possibly with trailing whitespace) */
export function isSlashCommand(input: string): SlashCommand | null {
  const trimmed = input.trim().toLowerCase();
  return slashCommands.find((cmd) => cmd.name === trimmed) ?? null;
}
