import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { CollectionForm, type CollectionFormData } from '@/components/admin/CollectionForm';

// ---------------------------------------------------------------------------
// Mock contract validation
// ---------------------------------------------------------------------------
describe('CollectionForm mock contract validation', () => {
  it('component receives callbacks via props (no external hooks to mock)', () => {
    const onSubmit = vi.fn();
    const { container } = render(<CollectionForm onSubmit={onSubmit} />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('CollectionForm', () => {
  let onSubmit: Mock<(data: CollectionFormData) => Promise<void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit = vi.fn<(data: CollectionFormData) => Promise<void>>().mockResolvedValue(undefined);
  });

  it('renders all required form fields', () => {
    render(<CollectionForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Provider *')).toBeInTheDocument();
    expect(screen.getByLabelText('Contract Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Chain ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Token Standard')).toBeInTheDocument();
    expect(screen.getByLabelText('Image URL')).toBeInTheDocument();
    expect(screen.getByLabelText('External URL')).toBeInTheDocument();
  });

  it('renders the default submit label', () => {
    render(<CollectionForm onSubmit={onSubmit} />);

    expect(screen.getByRole('button', { name: 'Create Collection' })).toBeInTheDocument();
  });

  it('renders a custom submit label', () => {
    render(<CollectionForm onSubmit={onSubmit} submitLabel="Update Collection" />);

    expect(screen.getByRole('button', { name: 'Update Collection' })).toBeInTheDocument();
  });

  it('submit button is disabled when name is empty', () => {
    render(<CollectionForm onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole('button', { name: 'Create Collection' });
    expect(submitBtn).toBeDisabled();
  });

  it('submit button is enabled when name has value', () => {
    render(<CollectionForm onSubmit={onSubmit} />);

    const nameInput = screen.getByLabelText('Name *');
    fireEvent.change(nameInput, { target: { value: 'My Collection' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Collection' });
    expect(submitBtn).not.toBeDisabled();
  });

  it('populates fields from initialData', () => {
    render(
      <CollectionForm
        onSubmit={onSubmit}
        initialData={{
          name: 'Existing Collection',
          description: 'A description',
          provider: 'zora_protocol',
          contractAddress: '0xtest',
          chainId: 84532,
          tokenStandard: 'erc1155',
          imageUrl: 'https://img.test',
          externalUrl: 'https://ext.test',
        }}
      />
    );

    expect(screen.getByLabelText('Name *')).toHaveValue('Existing Collection');
    expect(screen.getByLabelText('Description')).toHaveValue('A description');
    expect(screen.getByLabelText('Provider *')).toHaveValue('zora_protocol');
    expect(screen.getByLabelText('Contract Address')).toHaveValue('0xtest');
    expect(screen.getByLabelText('Chain ID')).toHaveValue('84532');
    expect(screen.getByLabelText('Token Standard')).toHaveValue('erc1155');
    expect(screen.getByLabelText('Image URL')).toHaveValue('https://img.test');
    expect(screen.getByLabelText('External URL')).toHaveValue('https://ext.test');
  });

  it('calls onSubmit with form data on submission', async () => {
    render(<CollectionForm onSubmit={onSubmit} />);

    // Fill in required name field
    fireEvent.change(screen.getByLabelText('Name *'), {
      target: { value: 'New Collection' },
    });

    // Fill optional description
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test description' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create Collection' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Collection',
          description: 'Test description',
          provider: 'onchainkit', // default
          chainId: 8453, // default
        })
      );
    });
  });

  it('renders provider options', () => {
    render(<CollectionForm onSubmit={onSubmit} />);

    const providerSelect = screen.getByLabelText('Provider *');
    expect(providerSelect).toHaveValue('onchainkit');

    // Check all options exist
    const options = providerSelect.querySelectorAll('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('OnchainKit');
    expect(options[1]).toHaveTextContent('Zora Protocol');
    expect(options[2]).toHaveTextContent('Zora Coins');
  });

  it('renders chain ID options', () => {
    render(<CollectionForm onSubmit={onSubmit} />);

    const chainSelect = screen.getByLabelText('Chain ID');
    const options = chainSelect.querySelectorAll('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Base Mainnet (8453)');
    expect(options[1]).toHaveTextContent('Base Sepolia (84532)');
  });

  it('renders token standard options', () => {
    render(<CollectionForm onSubmit={onSubmit} />);

    const standardSelect = screen.getByLabelText('Token Standard');
    const options = standardSelect.querySelectorAll('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent('Select...');
    expect(options[1]).toHaveTextContent('ERC-721');
    expect(options[2]).toHaveTextContent('ERC-1155');
    expect(options[3]).toHaveTextContent('ERC-20 (Coins)');
  });

  it('shows Zora Protocol config when provider is zora_protocol', () => {
    render(<CollectionForm onSubmit={onSubmit} initialData={{ provider: 'zora_protocol' }} />);

    expect(screen.getByText('Zora Protocol Config')).toBeInTheDocument();
    expect(screen.getByLabelText('Mint Referral Address')).toBeInTheDocument();
  });

  it('shows Zora Coins config when provider is zora_coins', () => {
    render(<CollectionForm onSubmit={onSubmit} initialData={{ provider: 'zora_coins' }} />);

    expect(screen.getByText('Zora Coins Config')).toBeInTheDocument();
    expect(screen.getByLabelText('Starting Market Cap')).toBeInTheDocument();
  });

  it('does not show provider-specific config for onchainkit', () => {
    render(<CollectionForm onSubmit={onSubmit} initialData={{ provider: 'onchainkit' }} />);

    expect(screen.queryByText('Zora Protocol Config')).not.toBeInTheDocument();
    expect(screen.queryByText('Zora Coins Config')).not.toBeInTheDocument();
  });

  it('switches provider config when provider changes', () => {
    render(<CollectionForm onSubmit={onSubmit} />);

    // Default is onchainkit - no special config
    expect(screen.queryByText('Zora Protocol Config')).not.toBeInTheDocument();

    // Switch to zora_protocol
    fireEvent.change(screen.getByLabelText('Provider *'), {
      target: { value: 'zora_protocol' },
    });

    expect(screen.getByText('Zora Protocol Config')).toBeInTheDocument();
    expect(screen.queryByText('Zora Coins Config')).not.toBeInTheDocument();

    // Switch to zora_coins
    fireEvent.change(screen.getByLabelText('Provider *'), {
      target: { value: 'zora_coins' },
    });

    expect(screen.queryByText('Zora Protocol Config')).not.toBeInTheDocument();
    expect(screen.getByText('Zora Coins Config')).toBeInTheDocument();
  });

  it('disables submit button when isLoading is true', () => {
    render(<CollectionForm onSubmit={onSubmit} isLoading={true} />);

    const submitBtn = screen.getByRole('button', { name: 'Create Collection' });
    expect(submitBtn).toBeDisabled();
  });

  it('Zora Coins config has market cap select with Low and High options', () => {
    render(<CollectionForm onSubmit={onSubmit} initialData={{ provider: 'zora_coins' }} />);

    const marketCapSelect = screen.getByLabelText('Starting Market Cap');
    const options = marketCapSelect.querySelectorAll('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Low');
    expect(options[1]).toHaveTextContent('High');
  });
});
