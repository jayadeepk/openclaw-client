import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../constants/theme';

interface MarkdownTextProps {
  children: string;
  baseStyle?: object;
}

/** Lightweight markdown renderer for assistant messages */
export function MarkdownText({ children, baseStyle }: MarkdownTextProps) {
  const blocks = parseBlocks(children);

  return (
    <View>
      {blocks.map((block, i) => renderBlock(block, i, baseStyle))}
    </View>
  );
}

// ─── Block-level parsing ─────────────────────────────────────────────────────

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'code'; lang: string; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fenceMatch = /^```(\w*)/.exec(line);
    if (fenceMatch) {
      const lang = fenceMatch[1];
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: 'code', lang, text: codeLines.join('\n') });
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,6})\s+(.+)/.exec(line);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Blank line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect contiguous non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+[.)]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
    }
  }

  return blocks;
}

// ─── Block rendering ─────────────────────────────────────────────────────────

function renderBlock(block: Block, key: number, baseStyle?: object): React.ReactNode {
  switch (block.type) {
    case 'paragraph':
      return (
        <Text key={key} style={[styles.paragraph, baseStyle]}>
          {renderInline(block.text)}
        </Text>
      );

    case 'heading':
      return (
        <Text
          key={key}
          style={[
            styles.paragraph,
            baseStyle,
            styles.heading,
            block.level <= 2 && styles.headingLarge,
          ]}
        >
          {renderInline(block.text)}
        </Text>
      );

    case 'code':
      return <CodeBlock key={key} lang={block.lang} text={block.text} />;

    case 'list':
      return (
        <View key={key} style={styles.list}>
          {block.items.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={[styles.listBullet, baseStyle]}>
                {block.ordered ? String(idx + 1) + '.' : '\u2022'}
              </Text>
              <Text style={[styles.paragraph, styles.listItemText, baseStyle]}>
                {renderInline(item)}
              </Text>
            </View>
          ))}
        </View>
      );
  }
}

// ─── Code block with copy button ─────────────────────────────────────────────

const COPIED_DISPLAY_MS = 1500;

function CodeBlock({ lang, text }: { lang: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!copied) return;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => { setCopied(false); });
    }, COPIED_DISPLAY_MS);
    return () => { clearTimeout(timer); };
  }, [copied, fadeAnim]);

  const handleCopy = useCallback(() => {
    void Clipboard.setStringAsync(text);
    setCopied(true);
  }, [text]);

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        {lang ? <Text style={styles.codeLang}>{lang}</Text> : <View />}
        <TouchableOpacity
          onPress={handleCopy}
          style={styles.copyBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Copy code"
        >
          <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.codeBlockText}>{text}</Text>
      {copied && (
        <Animated.View style={[styles.copiedOverlay, { opacity: fadeAnim }]}>
          <Text style={styles.copiedText}>Copied!</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Inline parsing ──────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  // Pattern: code(`), bold+italic(***), bold(**), italic(*/_), link
  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|(?<!\w)\*[^*]+\*(?!\w)|(?<!\w)_[^_]+_(?!\w)|\[[^\]]+\]\([^)]+\))/;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const match = regex.exec(remaining);
    if (!match) {
      parts.push(remaining);
      break;
    }

    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }

    const token = match[0];
    const k = keyIdx++;

    if (token.startsWith('`')) {
      parts.push(
        <Text key={k} style={styles.inlineCode}>
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (token.startsWith('***')) {
      parts.push(
        <Text key={k} style={styles.boldItalic}>
          {token.slice(3, -3)}
        </Text>,
      );
    } else if (token.startsWith('**')) {
      parts.push(
        <Text key={k} style={styles.bold}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (token.startsWith('*') || token.startsWith('_')) {
      parts.push(
        <Text key={k} style={styles.italic}>
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        parts.push(
          <Text key={k} style={styles.link}>
            {linkMatch[1]}
          </Text>,
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }

    remaining = remaining.slice(match.index + token.length);
  }

  return parts;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  paragraph: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  heading: {
    fontWeight: '700',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  headingLarge: {
    fontSize: theme.fontSize.lg,
    lineHeight: 26,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  boldItalic: {
    fontWeight: '700',
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: theme.colors.surface,
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  codeBlock: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginVertical: theme.spacing.xs,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  codeLang: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  copyBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceLight,
  },
  copyBtnText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  codeBlockText: {
    fontFamily: 'monospace',
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  copiedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedText: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  list: {
    marginBottom: theme.spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  listBullet: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    width: 20,
    lineHeight: 22,
  },
  listItemText: {
    flex: 1,
    marginBottom: 0,
  },
  link: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});
