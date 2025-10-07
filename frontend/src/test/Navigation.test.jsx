import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navigation } from '../components/Navigation'
import { useAuthStore } from '../stores'

// Mock the auth store
vi.mock('../stores', () => ({
  useAuthStore: vi.fn()
}))

describe('Navigation', () => {
  const mockLogout = vi.fn()
  const mockOnViewChange = vi.fn()

  const defaultUser = {
    name: 'Test User',
    role: 'member'
  }

  beforeEach(() => {
    useAuthStore.mockReturnValue({
      user: defaultUser,
      logout: mockLogout
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders navigation with user info', () => {
    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    expect(screen.getByText('Invoice Tracker')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('member')).toBeInTheDocument()
  })

  it('renders basic menu items for regular user', () => {
    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    expect(screen.getByText('Time Entries')).toBeInTheDocument()
    expect(screen.getByText('Invoices')).toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('renders admin menu item for admin user', () => {
    useAuthStore.mockReturnValue({
      user: { ...defaultUser, role: 'admin' },
      logout: mockLogout
    })

    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    expect(screen.getByText('Time Entries')).toBeInTheDocument()
    expect(screen.getByText('Invoices')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('highlights current view correctly', () => {
    render(<Navigation currentView="invoices" onViewChange={mockOnViewChange} />)

    const invoicesButton = screen.getByRole('button', { name: /invoices/i })
    const entriesButton = screen.getByRole('button', { name: /time entries/i })

    expect(invoicesButton).toHaveAttribute('aria-current', 'page')
    expect(entriesButton).not.toHaveAttribute('aria-current')
  })

  it('calls onViewChange when menu item is clicked', async () => {
    const user = userEvent.setup()
    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    const invoicesButton = screen.getByRole('button', { name: /invoices/i })
    await user.click(invoicesButton)

    expect(mockOnViewChange).toHaveBeenCalledWith('invoices')
  })

  it('calls logout when sign out button is clicked', async () => {
    const user = userEvent.setup()
    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    await user.click(signOutButton)

    expect(mockLogout).toHaveBeenCalled()
  })

  it('has proper accessibility attributes', () => {
    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    expect(signOutButton).toHaveAttribute('aria-label', 'Sign out')
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    const entriesButton = screen.getByRole('button', { name: /time entries/i })
    const invoicesButton = screen.getByRole('button', { name: /invoices/i })

    // Tab to entries button and press Enter
    await user.tab()
    expect(entriesButton).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(mockOnViewChange).toHaveBeenCalledWith('entries')

    // Tab to invoices button and press Space
    await user.tab()
    expect(invoicesButton).toHaveFocus()
    await user.keyboard(' ')
    expect(mockOnViewChange).toHaveBeenCalledWith('invoices')
  })

  it('displays mobile navigation on small screens', () => {
    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    // Check that both desktop and mobile versions exist
    const desktopNav = screen.getByRole('navigation').querySelector('.hidden.md\\:flex')
    const mobileNav = screen.getByRole('navigation').querySelector('.md\\:hidden')

    expect(desktopNav).toBeInTheDocument()
    expect(mobileNav).toBeInTheDocument()
  })

  it('shows user avatar placeholder', () => {
    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    // Check for user icon (avatar placeholder)
    const userIcon = screen.getByRole('navigation').querySelector('svg')
    expect(userIcon).toBeInTheDocument()
  })

  it('shows brand logo', () => {
    render(<Navigation currentView="entries" onViewChange={mockOnViewChange} />)

    expect(screen.getByText('Invoice Tracker')).toBeInTheDocument()
    
    // Check for home icon in brand
    const brandSection = screen.getByText('Invoice Tracker').closest('div')
    expect(brandSection.querySelector('svg')).toBeInTheDocument()
  })
})