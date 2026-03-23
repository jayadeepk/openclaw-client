import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { MarkdownText } from './MarkdownText';

describe('MarkdownText', () => {
  it('renders plain text', () => {
    render(<MarkdownText>Hello world</MarkdownText>);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('renders bold text', () => {
    render(<MarkdownText>{'This is **bold** text'}</MarkdownText>);
    expect(screen.getByText('bold')).toBeTruthy();
    expect(screen.getByText(/This is/)).toBeTruthy();
  });

  it('renders italic text', () => {
    render(<MarkdownText>{'This is *italic* text'}</MarkdownText>);
    expect(screen.getByText('italic')).toBeTruthy();
  });

  it('renders inline code', () => {
    render(<MarkdownText>{'Use `console.log` here'}</MarkdownText>);
    expect(screen.getByText('console.log')).toBeTruthy();
  });

  it('renders fenced code blocks', () => {
    const md = '```js\nconst x = 1;\n```';
    render(<MarkdownText>{md}</MarkdownText>);
    expect(screen.getByText('const x = 1;')).toBeTruthy();
  });

  it('renders headings', () => {
    render(<MarkdownText>{'## Section Title'}</MarkdownText>);
    expect(screen.getByText('Section Title')).toBeTruthy();
  });

  it('renders unordered lists', () => {
    const md = '- Item one\n- Item two';
    render(<MarkdownText>{md}</MarkdownText>);
    expect(screen.getByText('Item one')).toBeTruthy();
    expect(screen.getByText('Item two')).toBeTruthy();
  });

  it('renders ordered lists', () => {
    const md = '1. First\n2. Second';
    render(<MarkdownText>{md}</MarkdownText>);
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });

  it('renders links as styled text', () => {
    render(<MarkdownText>{'Visit [Google](https://google.com)'}</MarkdownText>);
    expect(screen.getByText('Google')).toBeTruthy();
  });

  it('renders bold italic text', () => {
    render(<MarkdownText>{'This is ***bold italic*** text'}</MarkdownText>);
    expect(screen.getByText('bold italic')).toBeTruthy();
  });

  it('handles mixed block types', () => {
    const md = '# Title\n\nSome text with **bold**.\n\n- list item\n\n```\ncode\n```';
    render(<MarkdownText>{md}</MarkdownText>);
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('bold')).toBeTruthy();
    expect(screen.getByText('list item')).toBeTruthy();
    expect(screen.getByText('code')).toBeTruthy();
  });

  describe('code block copy button', () => {
    it('renders a Copy button on code blocks', () => {
      const md = '```js\nconst x = 1;\n```';
      render(<MarkdownText>{md}</MarkdownText>);
      expect(screen.getByLabelText('Copy code')).toBeTruthy();
      expect(screen.getByText('Copy')).toBeTruthy();
    });

    it('shows language label when specified', () => {
      const md = '```typescript\nconst x = 1;\n```';
      render(<MarkdownText>{md}</MarkdownText>);
      expect(screen.getByText('typescript')).toBeTruthy();
    });

    it('copies code to clipboard when Copy is pressed', () => {
      const md = '```js\nconst x = 1;\n```';
      render(<MarkdownText>{md}</MarkdownText>);
      fireEvent.press(screen.getByLabelText('Copy code'));
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('const x = 1;');
    });

    it('shows Copied! text after pressing Copy', () => {
      const md = '```\nhello\n```';
      render(<MarkdownText>{md}</MarkdownText>);
      fireEvent.press(screen.getByLabelText('Copy code'));
      expect(screen.getAllByText('Copied!').length).toBeGreaterThanOrEqual(1);
    });

    it('Copied! indicator fades out after timeout', () => {
      jest.useFakeTimers();
      const md = '```\nhello\n```';
      render(<MarkdownText>{md}</MarkdownText>);

      act(() => {
        fireEvent.press(screen.getByLabelText('Copy code'));
      });
      expect(screen.getAllByText('Copied!').length).toBeGreaterThanOrEqual(1);

      // Advance past the COPIED_DISPLAY_MS (1500ms) timeout
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      jest.useRealTimers();
    });
  });

  describe('inline parsing edge cases', () => {
    it('renders a broken link syntax as plain text', () => {
      render(<MarkdownText>{'Check [broken link'}</MarkdownText>);
      expect(screen.getByText(/broken link/)).toBeTruthy();
    });
  });
});
