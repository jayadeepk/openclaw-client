import React from 'react';
import { render } from '@testing-library/react-native';
import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  it('renders three animated dots', () => {
    const { toJSON } = render(<TypingIndicator />);
    const tree = toJSON() as { children: { children: unknown[] }[] };
    expect(tree).toBeTruthy();
    // The bubble contains 3 dot views
    const bubble = tree.children[0];
    expect(bubble.children).toHaveLength(3);
  });

  it('has accessible label', () => {
    const { getByLabelText } = render(<TypingIndicator />);
    expect(getByLabelText('Assistant is typing')).toBeTruthy();
  });
});
