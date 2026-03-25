import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchBar } from './SearchBar';

const defaultProps = {
  query: '',
  onChangeQuery: jest.fn(),
  matchCount: 0,
  currentIndex: 0,
  onPrev: jest.fn(),
  onNext: jest.fn(),
  onClose: jest.fn(),
};

describe('SearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the search input', () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.getByLabelText('Search messages')).toBeTruthy();
  });

  it('calls onChangeQuery when typing', () => {
    render(<SearchBar {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Search messages'), 'hello');
    expect(defaultProps.onChangeQuery).toHaveBeenCalledWith('hello');
  });

  it('shows match count when query is non-empty', () => {
    render(<SearchBar {...defaultProps} query="test" matchCount={5} currentIndex={2} />);
    expect(screen.getByText('3/5')).toBeTruthy();
  });

  it('shows "0 results" when no matches', () => {
    render(<SearchBar {...defaultProps} query="test" matchCount={0} />);
    expect(screen.getByText('0 results')).toBeTruthy();
  });

  it('calls onPrev when previous button pressed', () => {
    render(<SearchBar {...defaultProps} query="test" matchCount={3} />);
    fireEvent.press(screen.getByLabelText('Previous match'));
    expect(defaultProps.onPrev).toHaveBeenCalled();
  });

  it('calls onNext when next button pressed', () => {
    render(<SearchBar {...defaultProps} query="test" matchCount={3} />);
    fireEvent.press(screen.getByLabelText('Next match'));
    expect(defaultProps.onNext).toHaveBeenCalled();
  });

  it('calls onClose when Done pressed', () => {
    render(<SearchBar {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('Close search'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows clear button when query is non-empty', () => {
    render(<SearchBar {...defaultProps} query="test" />);
    expect(screen.getByLabelText('Clear search')).toBeTruthy();
  });

  it('clears query on clear button press', () => {
    render(<SearchBar {...defaultProps} query="test" />);
    fireEvent.press(screen.getByLabelText('Clear search'));
    expect(defaultProps.onChangeQuery).toHaveBeenCalledWith('');
  });

  it('hides clear button when query is empty', () => {
    render(<SearchBar {...defaultProps} query="" />);
    expect(screen.queryByLabelText('Clear search')).toBeNull();
  });
});
