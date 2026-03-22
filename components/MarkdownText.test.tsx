import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
});
