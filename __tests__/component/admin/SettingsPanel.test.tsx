import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { AppSetting } from '@/types/admin';

import { SettingsPanel } from '@/components/admin/SettingsPanel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSetting(overrides: Partial<AppSetting> = {}): AppSetting {
  return {
    id: 'setting-1',
    key: 'site_name',
    value: 'My App',
    description: 'The name of the application',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('SettingsPanel mock contract validation', () => {
  it('component is presentational with callback props (no external hooks to mock)', () => {
    // SettingsPanel receives data and callbacks via props.
    // Validate it renders without needing external hook mocks.
    const onSave = vi.fn();
    const { container } = render(<SettingsPanel settings={[]} onSave={onSave} />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('SettingsPanel', () => {
  let onSave: Mock<(key: string, value: unknown) => Promise<void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSave = vi.fn<(key: string, value: unknown) => Promise<void>>().mockResolvedValue(undefined);
  });

  it('renders empty state when no settings', () => {
    render(<SettingsPanel settings={[]} onSave={onSave} />);

    expect(screen.getByText('App Settings')).toBeInTheDocument();
    expect(screen.getByText('No settings configured.')).toBeInTheDocument();
  });

  it('renders settings list with key, value, and description', () => {
    const settings = [
      makeSetting({
        id: 'setting-1',
        key: 'site_name',
        value: 'My App',
        description: 'The name of the application',
      }),
      makeSetting({
        id: 'setting-2',
        key: 'maintenance_mode',
        value: false,
        description: 'Enable maintenance mode',
      }),
    ];

    render(<SettingsPanel settings={settings} onSave={onSave} />);

    expect(screen.getByText('site_name')).toBeInTheDocument();
    expect(screen.getByText('"My App"')).toBeInTheDocument();
    expect(screen.getByText('The name of the application')).toBeInTheDocument();
    expect(screen.getByText('maintenance_mode')).toBeInTheDocument();
    expect(screen.getByText('false')).toBeInTheDocument();
    expect(screen.getByText('Enable maintenance mode')).toBeInTheDocument();
  });

  it('shows Edit button for each setting', () => {
    const settings = [
      makeSetting({ id: 's1', key: 'key1' }),
      makeSetting({ id: 's2', key: 'key2' }),
    ];

    render(<SettingsPanel settings={settings} onSave={onSave} />);

    const editButtons = screen.getAllByText('Edit');
    expect(editButtons).toHaveLength(2);
  });

  it('enters edit mode when Edit button is clicked', () => {
    const settings = [makeSetting({ key: 'site_name', value: 'My App' })];

    render(<SettingsPanel settings={settings} onSave={onSave} />);

    fireEvent.click(screen.getByText('Edit'));

    // Should show textarea with the JSON-serialized value
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('"My App"');

    // Should show Save and Cancel buttons
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('cancels edit mode and clears input', () => {
    const settings = [makeSetting({ key: 'site_name', value: 'My App' })];

    render(<SettingsPanel settings={settings} onSave={onSave} />);

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Textarea should be gone, Edit button should be back
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('calls onSave with parsed JSON when Save is clicked', async () => {
    const settings = [makeSetting({ key: 'site_name', value: 'My App' })];

    render(<SettingsPanel settings={settings} onSave={onSave} />);

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit'));

    // Change value
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '"New Name"' } });

    // Save
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('site_name', 'New Name');
    });
  });

  it('exits edit mode after successful save', async () => {
    const settings = [makeSetting({ key: 'site_name', value: 'My App' })];

    render(<SettingsPanel settings={settings} onSave={onSave} />);

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('stays in edit mode when invalid JSON is entered', async () => {
    const settings = [makeSetting({ key: 'site_name', value: 'My App' })];

    render(<SettingsPanel settings={settings} onSave={onSave} />);

    // Enter edit mode
    fireEvent.click(screen.getByText('Edit'));

    // Enter invalid JSON
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '{invalid json' } });

    // Try to save
    fireEvent.click(screen.getByText('Save'));

    // Should NOT have called onSave
    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled();
    });

    // Textarea should still be visible (still in edit mode)
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders setting without description', () => {
    const settings = [makeSetting({ key: 'feature_flag', value: true, description: undefined })];

    render(<SettingsPanel settings={settings} onSave={onSave} />);

    expect(screen.getByText('feature_flag')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SettingsPanel settings={[]} onSave={onSave} className="custom-panel" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-panel');
  });
});
