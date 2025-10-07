import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvoiceModal } from '../components/InvoiceModal'

describe('InvoiceModal', () => {
  const mockInvoice = {
    id: 1,
    status: 'submitted',
    submitted_at: '2023-01-15T10:00:00Z',
    period_start: '2023-01-01',
    period_end: '2023-01-07',
    total_hours: 40,
    total_amount: 3000,
    entries: [
      {
        id: 1,
        date: '2023-01-01',
        task: 'Development work',
        notes: 'Fixed bugs and added features',
        hours: 8,
        rate: 75,
        amount: 600
      },
      {
        id: 2,
        date: '2023-01-02',
        task: 'Code review',
        notes: 'Reviewed pull requests',
        hours: 4,
        rate: 75,
        amount: 300
      }
    ]
  }

  const mockOnClose = vi.fn()
  const mockOnDownload = vi.fn()

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders invoice modal with invoice details', () => {
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    expect(screen.getByText('Invoice Details')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // Invoice ID
    expect(screen.getByText('submitted')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument() // Total hours
    expect(screen.getByText('$3,000.00')).toBeInTheDocument() // Total amount
  })

  it('displays time entries grouped by date', () => {
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    expect(screen.getByText('Development work')).toBeInTheDocument()
    expect(screen.getByText('Fixed bugs and added features')).toBeInTheDocument()
    expect(screen.getByText('Code review')).toBeInTheDocument()
    expect(screen.getByText('Reviewed pull requests')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    // Check that dates are formatted (exact format may vary by locale)
    expect(screen.getByText(/1\/1\/2023|Jan 1, 2023|2023-01-01/)).toBeInTheDocument()
    expect(screen.getByText(/1\/2\/2023|Jan 2, 2023|2023-01-02/)).toBeInTheDocument()
  })

  it('shows download button when onDownload is provided', () => {
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    const downloadButton = screen.getByRole('button', { name: /download/i })
    expect(downloadButton).toBeInTheDocument()
  })

  it('hides download button when onDownload is not provided', () => {
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
      />
    )

    const downloadButton = screen.queryByRole('button', { name: /download/i })
    expect(downloadButton).not.toBeInTheDocument()
  })

  it('calls onDownload when download button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    const downloadButton = screen.getByRole('button', { name: /download/i })
    await user.click(downloadButton)

    expect(mockOnDownload).toHaveBeenCalledWith(mockInvoice)
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close modal/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    // Click on the backdrop (modal overlay)
    const backdrop = screen.getByRole('dialog').parentElement
    await user.click(backdrop)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('does not close when modal content is clicked', async () => {
    const user = userEvent.setup()
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    // Click on modal content
    const modalContent = screen.getByRole('dialog')
    await user.click(modalContent)

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('handles invoice with no entries', () => {
    const emptyInvoice = {
      ...mockInvoice,
      entries: []
    }

    render(
      <InvoiceModal 
        invoice={emptyInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    expect(screen.getByText('No time entries found for this invoice.')).toBeInTheDocument()
  })

  it('handles paid invoice status', () => {
    const paidInvoice = {
      ...mockInvoice,
      status: 'paid',
      paid_at: '2023-01-20T12:00:00Z'
    }

    render(
      <InvoiceModal 
        invoice={paidInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    expect(screen.getByText('paid')).toBeInTheDocument()
    // Should show paid date
    expect(screen.getByText(/Paid:/)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    const modal = screen.getByRole('dialog')
    expect(modal).toHaveAttribute('aria-modal', 'true')
    expect(modal).toHaveAttribute('aria-labelledby', 'invoice-modal-title')

    const title = screen.getByText('Invoice Details')
    expect(title).toHaveAttribute('id', 'invoice-modal-title')

    const closeButton = screen.getByRole('button', { name: /close modal/i })
    expect(closeButton).toHaveAttribute('aria-label', 'Close modal')

    const downloadButton = screen.getByRole('button', { name: /download invoice/i })
    expect(downloadButton).toHaveAttribute('aria-label', 'Download invoice')
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <InvoiceModal 
        invoice={mockInvoice} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    // Test tabbing through interactive elements
    await user.tab() // Should focus download button
    expect(screen.getByRole('button', { name: /download/i })).toHaveFocus()

    await user.tab() // Should focus close button
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus()

    // Test Escape key
    await user.keyboard('{Escape}')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calculates daily totals correctly', () => {
    const invoiceWithMultipleEntries = {
      ...mockInvoice,
      entries: [
        {
          id: 1,
          date: '2023-01-01',
          task: 'Task 1',
          hours: 4,
          rate: 75,
          amount: 300
        },
        {
          id: 2,
          date: '2023-01-01',
          task: 'Task 2',
          hours: 4,
          rate: 75,
          amount: 300
        }
      ]
    }

    render(
      <InvoiceModal 
        invoice={invoiceWithMultipleEntries} 
        entries={[]} 
        onClose={mockOnClose}
        onDownload={mockOnDownload}
      />
    )

    // Should show combined hours and amount for the day
    expect(screen.getByText('8 hours')).toBeInTheDocument()
    expect(screen.getByText('$600.00')).toBeInTheDocument()
  })
})