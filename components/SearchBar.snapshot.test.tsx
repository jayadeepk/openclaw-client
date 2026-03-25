import React from 'react';
import { render } from '@testing-library/react-native';
import { SearchBar } from './SearchBar';

describe('SearchBar snapshots', () => {
  it('empty query', () => {
    const { toJSON } = render(
      <SearchBar
        query=""
        onChangeQuery={jest.fn()}
        matchCount={0}
        currentIndex={0}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('with matches', () => {
    const { toJSON } = render(
      <SearchBar
        query="hello"
        onChangeQuery={jest.fn()}
        matchCount={3}
        currentIndex={1}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
