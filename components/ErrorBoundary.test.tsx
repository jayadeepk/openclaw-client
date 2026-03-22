import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('test explosion');
  return <Text>All good</Text>;
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(getByText('All good')).toBeTruthy();
  });

  it('renders fallback UI when child throws', () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(queryByText('All good')).toBeNull();
  });

  it('recovers when Try Again is pressed', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(getByText('Something went wrong')).toBeTruthy();

    // Re-render with non-throwing child, then press reset
    rerender(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    fireEvent.press(getByText('Try Again'));
    expect(getByText('All good')).toBeTruthy();
  });
});
