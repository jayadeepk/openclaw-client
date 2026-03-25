import React from 'react';
import { render } from '@testing-library/react-native';
import { MarkdownText } from './MarkdownText';

describe('MarkdownText snapshots', () => {
  it('plain text', () => {
    const { toJSON } = render(<MarkdownText>Hello world</MarkdownText>);
    expect(toJSON()).toMatchSnapshot();
  });

  it('rich markdown', () => {
    const md = [
      '## Heading',
      '',
      'Paragraph with **bold**, *italic*, and `code`.',
      '',
      '- Bullet one',
      '- Bullet two',
      '',
      '```ts',
      'const x = 42;',
      '```',
    ].join('\n');
    const { toJSON } = render(<MarkdownText>{md}</MarkdownText>);
    expect(toJSON()).toMatchSnapshot();
  });
});
