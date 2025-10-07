import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginScreen } from '../components/LoginScreen'
import { useAuthStore } from '../stores'

// Mock the auth store
vi.mock('../stores', () => ({
  useAuthStore: vi.fn()
}))

describe('LoginScreen', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    useAuthStore.mockReturnValue({
      login: mockLogin
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with all required elements', () => {
    render(<LoginScreen />)

    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to access your time tracking dashboard')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('PIN')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('has proper form accessibility attributes', () => {
    render(<LoginScreen />)

    const nameInput = screen.getByLabelText('Name')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    expect(nameInput).toHaveAttribute('required')
    expect(nameInput).toHaveAttribute('autoComplete', 'username')
    expect(pinInput).toHaveAttribute('required')
    expect(pinInput).toHaveAttribute('type', 'password')
    expect(pinInput).toHaveAttribute('autoComplete', 'current-password')
    expect(submitButton).toHaveAttribute('type', 'submit')
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<LoginScreen />)

    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    // Try to submit without filling fields
    await user.click(submitButton)

    expect(screen.getByText('Please enter your name')).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('validates PIN field when name is provided', async () => {
    const user = userEvent.setup()
    render(<LoginScreen />)

    const nameInput = screen.getByLabelText('Name')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    await user.type(nameInput, 'Test User')
    await user.click(submitButton)

    expect(screen.getByText('Please enter your PIN')).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('trims whitespace from input values', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ success: true, user: { name: 'Test User' } })
    
    render(<LoginScreen />)

    const nameInput = screen.getByLabelText('Name')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    await user.type(nameInput, '  Test User  ')
    await user.type(pinInput, '  1234  ')
    await user.click(submitButton)

    expect(mockLogin).toHaveBeenCalledWith('Test User', '1234')
  })

  it('calls login function with correct parameters', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ success: true, user: { name: 'Test User' } })
    
    render(<LoginScreen />)

    const nameInput = screen.getByLabelText('Name')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    await user.type(nameInput, 'Test User')
    await user.type(pinInput, '1234')
    await user.click(submitButton)

    expect(mockLogin).toHaveBeenCalledWith('Test User', '1234')
  })

  it('shows loading state during login', async () => {
    const user = userEvent.setup()
    let resolveLogin
    const loginPromise = new Promise(resolve => {
      resolveLogin = resolve
    })
    mockLogin.mockReturnValue(loginPromise)
    
    render(<LoginScreen />)

    const nameInput = screen.getByLabelText('Name')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    await user.type(nameInput, 'Test User')
    await user.type(pinInput, '1234')
    await user.click(submitButton)

    // Check loading state
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    expect(nameInput).toBeDisabled()
    expect(pinInput).toBeDisabled()

    // Resolve login
    resolveLogin({ success: true, user: { name: 'Test User' } })
    
    await waitFor(() => {
      expect(screen.queryByText('Signing in...')).not.toBeInTheDocument()
    })
  })

  it('displays error message on login failure', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' })
    
    render(<LoginScreen />)

    const nameInput = screen.getByLabelText('Name')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    await user.type(nameInput, 'Test User')
    await user.type(pinInput, 'wrong')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    // Form should be re-enabled
    expect(submitButton).not.toBeDisabled()
    expect(nameInput).not.toBeDisabled()
    expect(pinInput).not.toBeDisabled()
  })

  it('handles unexpected errors gracefully', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Network error'))
    
    render(<LoginScreen />)

    const nameInput = screen.getByLabelText('Name')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    await user.type(nameInput, 'Test User')
    await user.type(pinInput, '1234')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
    })
  })

  it('allows form submission with Enter key', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ success: true, user: { name: 'Test User' } })
    
    render(<LoginScreen />)

    const nameInput = screen.getByLabelText('Name')
    const pinInput = screen.getByLabelText('PIN')
    
    await user.type(nameInput, 'Test User')
    await user.type(pinInput, '1234')
    await user.keyboard('{Enter}')

    expect(mockLogin).toHaveBeenCalledWith('Test User', '1234')
  })

  it('clears error when user starts typing again', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' })
    
    render(<LoginScreen />)

    const nameInput = screen.getByLabelText('Name')
    const pinInput = screen.getByLabelText('PIN')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    
    // Cause an error
    await user.type(nameInput, 'Test User')
    await user.type(pinInput, 'wrong')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    // Start typing again
    await user.clear(pinInput)
    await user.type(pinInput, '1234')

    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
  })
})