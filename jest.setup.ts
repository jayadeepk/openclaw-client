jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-av', () => {
  const mockSound = {
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    stopAsync: jest.fn().mockResolvedValue(undefined),
    setOnPlaybackStatusUpdate: jest.fn(),
  };
  return {
    Audio: {
      Sound: {
        createAsync: jest.fn().mockResolvedValue({ sound: mockSound }),
      },
      setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    },
  };
});

jest.mock('expo-file-system', () => {
  const mockFile = {
    uri: 'file:///mock/cache/openclaw_tts.mp3',
    write: jest.fn(),
    delete: jest.fn(),
  };
  return {
    File: jest.fn().mockImplementation(() => mockFile),
    Paths: { cache: '/mock/cache' },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));
