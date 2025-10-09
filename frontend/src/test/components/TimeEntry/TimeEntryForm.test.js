import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeEntryForm } from '../../components/TimeEntry/TimeEntryForm';

// Mock dependencies
jest.mock('../../hooks/useForm');
jest.mock('../../utils/validation');

const mockUseForm = require('../../hooks/useForm').useForm;
const mockValidationSchemas = require('../../utils/validation').ValidationSchemas;

describe('TimeEntryForm', () => {
  const mockOnSubmit = jest.fn();
  const mockUpdateField = jest.fn();
  const mockResetForm = jest.fn();
  const mockHandleInputChange = jest.fn();

  const defaultFormData = {
    hours: '',
    task: '',
    notes: '',
    date: '2025-10-09',
    tag: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseForm.mockReturnValue({
      formData: defaultFormData,
      updateField: mockUpdateField,
      resetForm: mockResetForm,
      handleInputChange: mockHandleInputChange
    });

    mockValidationSchemas.timeEntry = {
      validate: jest.fn().mockReturnValue({
        isValid: true,
        errorFields: {}
      })
    };
  });

  describe('Rendering', () => {
    it('renders form with all required fields', () => {
      render(<TimeEntryForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/hours worked/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/task description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tag/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
    });

    it('renders in edit mode when isEditing is true', () => {
      render(<TimeEntryForm onSubmit={mockOnSubmit} isEditing={true} />);

      expect(screen.getByText(/edit time entry/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update entry/i })).toBeInTheDocument();
    });

    it('shows cancel button when onCancel is provided', () => {
      const mockOnCancel = jest.fn();
      render(<TimeEntryForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('disables submit button when form is invalid', () => {
      mockUseForm.mockReturnValue({
        formData: { ...defaultFormData, hours: '', task: '' },
        updateField: mockUpdateField,
        resetForm: mockResetForm,
        handleInputChange: mockHandleInputChange
      });

      render(<TimeEntryForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /add entry/i });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when form is valid', () => {
      mockUseForm.mockReturnValue({
        formData: { 
          hours: '8',
          task: 'Development work',
          notes: '',
          date: '2025-10-09',
          tag: ''
        },
        updateField: mockUpdateField,
        resetForm: mockResetForm,
        handleInputChange: mockHandleInputChange
      });

      render(<TimeEntryForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /add entry/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('shows validation errors when form is invalid', () => {
      mockValidationSchemas.timeEntry.validate.mockReturnValue({
        isValid: false,
        errorFields: {
          hours: 'Hours must be a positive number',
          task: 'Task description is required'
        }
      });

      render(<TimeEntryForm onSubmit={mockOnSubmit} />);

      // Trigger validation by attempting to submit
      const submitButton = screen.getByRole('button', { name: /add entry/i });
      fireEvent.click(submitButton);

      waitFor(() => {
        expect(screen.getByText(/hours must be a positive number/i)).toBeInTheDocument();
        expect(screen.getByText(/task description is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      mockUseForm.mockReturnValue({
        formData: {
          hours: '8',
          task: 'Development work',
          notes: 'Working on new features',
          date: '2025-10-09',
          tag: 'development'
        },
        updateField: mockUpdateField,
        resetForm: mockResetForm,
        handleInputChange: mockHandleInputChange
      });
    });

    it('calls onSubmit with form data when form is submitted', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /add entry/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          hours: '8',
          task: 'Development work',
          notes: 'Working on new features',
          date: '2025-10-09',
          tag: 'development'
        });
      });
    });

    it('resets form after successful submission when not editing', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /add entry/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetForm).toHaveBeenCalled();
      });
    });

    it('does not reset form after successful submission when editing', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm onSubmit={mockOnSubmit} isEditing={true} />);

      const submitButton = screen.getByRole('button', { name: /update entry/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetForm).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('disables form inputs when loading', () => {
      render(<TimeEntryForm onSubmit={mockOnSubmit} loading={true} />);

      expect(screen.getByLabelText(/hours worked/i)).toBeDisabled();
      expect(screen.getByLabelText(/task description/i)).toBeDisabled();
      expect(screen.getByLabelText(/date/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /add entry/i })).toBeDisabled();
    });

    it('shows loading spinner in submit button when loading', () => {
      render(<TimeEntryForm onSubmit={mockOnSubmit} loading={true} />);

      expect(screen.getByRole('button', { name: /add entry/i })).toContainElement(
        screen.getByTestId('loading-spinner')
      );
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnCancel = jest.fn();
      render(<TimeEntryForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('resets form when cancel is clicked and no onCancel provided', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm onSubmit={mockOnSubmit} isEditing={true} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockResetForm).toHaveBeenCalled();
    });
  });
});