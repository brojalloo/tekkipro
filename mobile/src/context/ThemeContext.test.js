import React from 'react';
import { Button, Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

function Probe() {
  const { theme, isDark, setTheme } = useTheme();

  return (
    <>
      <Text testID="theme-value">{theme}</Text>
      <Text testID="theme-dark-flag">{String(isDark)}</Text>
      <Button title="set-light" onPress={() => setTheme('light')} />
    </>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the stored theme preference', async () => {
    AsyncStorage.getItem.mockResolvedValue('light');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByTestId('theme-value').props.children).toBe('light'));
    expect(screen.getByTestId('theme-dark-flag').props.children).toBe('false');
  });

  it('persists theme changes', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByText('set-light'));

    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('tekkipro.theme', 'light'));
    expect(screen.getByTestId('theme-value').props.children).toBe('light');
  });
});