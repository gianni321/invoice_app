import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import InvoiceGenerator from '../components/InvoiceGenerator';
import { useEntriesStore } from '../stores/entriesStore';
import { useInvoiceStore } from '../stores/invoiceStore';

// Mock the stores
vi.mock('../stores/entriesStore');
vi.mock('../stores/invoiceStore');

// Mock PDF generation
vi.mock('../utils/pdfGenerator', () => ({
  generateInvoicePDF: vi.fn().mockResolvedValue(new Blob(['fake pdf'], { type: 'application/pdf' }))
}));

describe('InvoiceGenerator', () => {
  const mockEntries = [
    {
      id: 1,
      description: 'Website development',
      hours: 8,
      project: 'Client Project',
      date: '2024-01-15'
    },
    {
      id: 2,
      description: 'Bug fixes',
      hours: 4,
      project: 'Client Project',
      date: '2024-01-16'
    }
  ];

  const mockGenerateInvoice = vi.fn();
  const mockCreateInvoice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    useEntriesStore.mockReturnValue({
      entries: mockEntries,
      fetchEntries: vi.fn(),
      isLoading: false
    });

    useInvoiceStore.mockReturnValue({
      generateInvoice: mockGenerateInvoice,
      createInvoice: mockCreateInvoice,
      isLoading: false,
      error: null
    });
  });

  describe('Initial render', () => {
    it('should render invoice generator form', () => {
      render(<InvoiceGenerator />);

      expect(screen.getByText(/generate invoice/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hourly rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it('should show entry selection checkboxes', () => {
      render(<InvoiceGenerator />);

      expect(screen.getByText(/select entries/i)).toBeInTheDocument();
      expect(screen.getByText('Website development')).toBeInTheDocument();
      expect(screen.getByText('Bug fixes')).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      const generateButton = screen.getByRole('button', { name: /generate invoice/i });
      await user.click(generateButton);

      expect(screen.getByText(/client name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/hourly rate is required/i)).toBeInTheDocument();
    });

    it('should validate positive hourly rate', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      await user.type(screen.getByLabelText(/hourly rate/i), '-50');

      const generateButton = screen.getByRole('button', { name: /generate invoice/i });
      await user.click(generateButton);

      expect(screen.getByText(/hourly rate must be positive/i)).toBeInTheDocument();
    });

    it('should validate date range', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      await user.type(screen.getByLabelText(/start date/i), '2024-01-20');
      await user.type(screen.getByLabelText(/end date/i), '2024-01-10');

      const generateButton = screen.getByRole('button', { name: /generate invoice/i });
      await user.click(generateButton);

      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
    });

    it('should require at least one entry selection', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      await user.type(screen.getByLabelText(/client name/i), 'Test Client');
      await user.type(screen.getByLabelText(/hourly rate/i), '50');

      const generateButton = screen.getByRole('button', { name: /generate invoice/i });
      await user.click(generateButton);

      expect(screen.getByText(/select at least one entry/i)).toBeInTheDocument();
    });
  });

  describe('Entry selection', () => {
    it('should allow selecting individual entries', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      const firstCheckbox = screen.getByRole('checkbox', { name: /website development/i });
      await user.click(firstCheckbox);

      expect(firstCheckbox).toBeChecked();
    });

    it('should show select all/none functionality', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      const selectAllButton = screen.getByRole('button', { name: /select all/i });
      await user.click(selectAllButton);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });

      const selectNoneButton = screen.getByRole('button', { name: /select none/i });
      await user.click(selectNoneButton);

      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('should filter entries by date range', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      await user.type(screen.getByLabelText(/start date/i), '2024-01-15');
      await user.type(screen.getByLabelText(/end date/i), '2024-01-15');

      // Should only show the first entry
      expect(screen.getByText('Website development')).toBeInTheDocument();
      expect(screen.queryByText('Bug fixes')).not.toBeInTheDocument();
    });
  });

  describe('Invoice generation', () => {
    it('should generate invoice with selected entries', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      // Fill form
      await user.type(screen.getByLabelText(/client name/i), 'Test Client');
      await user.type(screen.getByLabelText(/hourly rate/i), '50');

      // Select entries
      await user.click(screen.getByRole('checkbox', { name: /website development/i }));
      await user.click(screen.getByRole('checkbox', { name: /bug fixes/i }));

      // Generate
      const generateButton = screen.getByRole('button', { name: /generate invoice/i });
      await user.click(generateButton);

      expect(mockGenerateInvoice).toHaveBeenCalledWith({
        clientName: 'Test Client',
        hourlyRate: 50,
        entries: mockEntries,
        startDate: undefined,
        endDate: undefined
      });
    });

    it('should calculate total amount correctly', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      await user.type(screen.getByLabelText(/hourly rate/i), '50');

      // Select all entries
      await user.click(screen.getByRole('button', { name: /select all/i }));

      // Should show total: (8 + 4) * 50 = 600
      expect(screen.getByText(/total: \$600/i)).toBeInTheDocument();
    });
  });

  describe('Invoice preview', () => {
    it('should show invoice preview after generation', async () => {
      const mockInvoiceData = {
        id: 1,
        clientName: 'Test Client',
        total: 600,
        entries: mockEntries
      };

      mockGenerateInvoice.mockResolvedValue(mockInvoiceData);

      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      // Fill and submit form
      await user.type(screen.getByLabelText(/client name/i), 'Test Client');
      await user.type(screen.getByLabelText(/hourly rate/i), '50');
      await user.click(screen.getByRole('button', { name: /select all/i }));
      await user.click(screen.getByRole('button', { name: /generate invoice/i }));

      await waitFor(() => {
        expect(screen.getByText(/invoice preview/i)).toBeInTheDocument();
        expect(screen.getByText('Test Client')).toBeInTheDocument();
        expect(screen.getByText('$600')).toBeInTheDocument();
      });
    });

    it('should allow downloading PDF', async () => {
      const mockInvoiceData = {
        id: 1,
        clientName: 'Test Client',
        total: 600,
        entries: mockEntries
      };

      mockGenerateInvoice.mockResolvedValue(mockInvoiceData);

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
      global.URL.revokeObjectURL = vi.fn();

      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      // Generate invoice first
      await user.type(screen.getByLabelText(/client name/i), 'Test Client');
      await user.type(screen.getByLabelText(/hourly rate/i), '50');
      await user.click(screen.getByRole('button', { name: /select all/i }));
      await user.click(screen.getByRole('button', { name: /generate invoice/i }));

      await waitFor(() => {
        expect(screen.getByText(/invoice preview/i)).toBeInTheDocument();
      });

      // Download PDF
      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      await user.click(downloadButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Loading and error states', () => {
    it('should show loading state during generation', () => {
      useInvoiceStore.mockReturnValue({
        generateInvoice: mockGenerateInvoice,
        createInvoice: mockCreateInvoice,
        isLoading: true,
        error: null
      });

      render(<InvoiceGenerator />);

      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
    });

    it('should display error messages', () => {
      useInvoiceStore.mockReturnValue({
        generateInvoice: mockGenerateInvoice,
        createInvoice: mockCreateInvoice,
        isLoading: false,
        error: 'Failed to generate invoice'
      });

      render(<InvoiceGenerator />);

      expect(screen.getByText(/failed to generate invoice/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<InvoiceGenerator />);

      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hourly rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<InvoiceGenerator />);

      const clientInput = screen.getByLabelText(/client name/i);
      const rateInput = screen.getByLabelText(/hourly rate/i);

      clientInput.focus();
      expect(clientInput).toHaveFocus();

      await user.tab();
      expect(rateInput).toHaveFocus();
    });
  });
});