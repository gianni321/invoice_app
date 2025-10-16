import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import TimeEntryForm from '../components/TimeEntryForm';
import { useEntriesStore } from '../stores/entriesStore';

// Mock the store
vi.mock('../stores/entriesStore');

describe('TimeEntryForm', () => {
  const mockAddEntry = vi.fn();
  const mockUpdateEntry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useEntriesStore.mockReturnValue({
      addEntry: mockAddEntry,
      updateEntry: mockUpdateEntry,
      isLoading: false,
      error: null
    });
  });

  describe('Creating new entry', () => {
    it('should render form fields correctly', () => {
      render(<TimeEntryForm />);

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hours/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save entry/i })).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm />);

      const saveButton = screen.getByRole('button', { name: /save entry/i });
      await user.click(saveButton);

      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/hours is required/i)).toBeInTheDocument();
      expect(screen.getByText(/project is required/i)).toBeInTheDocument();
    });

    it('should validate hours format', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm />);

      const hoursInput = screen.getByLabelText(/hours/i);
      await user.type(hoursInput, '-1');

      const saveButton = screen.getByRole('button', { name: /save entry/i });
      await user.click(saveButton);

      expect(screen.getByText(/hours must be positive/i)).toBeInTheDocument();
    });

    it('should create entry with valid data', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm />);

      // Fill form
      await user.type(screen.getByLabelText(/description/i), 'Test work session');
      await user.type(screen.getByLabelText(/hours/i), '2.5');
      await user.type(screen.getByLabelText(/project/i), 'Test Project');
      await user.type(screen.getByLabelText(/date/i), '2024-01-15');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save entry/i });
      await user.click(saveButton);

      expect(mockAddEntry).toHaveBeenCalledWith({
        description: 'Test work session',
        hours: 2.5,
        project: 'Test Project',
        date: '2024-01-15'
      });
    });
  });

  describe('Editing existing entry', () => {
    const existingEntry = {
      id: 1,
      description: 'Existing work',
      hours: 1.5,
      project: 'Existing Project',
      date: '2024-01-10'
    };

    it('should populate form with existing data', () => {
      render(<TimeEntryForm entry={existingEntry} />);

      expect(screen.getByDisplayValue('Existing work')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing Project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-10')).toBeInTheDocument();
    });

    it('should update entry when editing', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm entry={existingEntry} />);

      // Modify description
      const descriptionInput = screen.getByDisplayValue('Existing work');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated work');

      // Submit
      const saveButton = screen.getByRole('button', { name: /update entry/i });
      await user.click(saveButton);

      expect(mockUpdateEntry).toHaveBeenCalledWith(1, {
        description: 'Updated work',
        hours: 1.5,
        project: 'Existing Project',
        date: '2024-01-10'
      });
    });
  });

  describe('Loading and error states', () => {
    it('should show loading state', () => {
      useEntriesStore.mockReturnValue({
        addEntry: mockAddEntry,
        updateEntry: mockUpdateEntry,
        isLoading: true,
        error: null
      });

      render(<TimeEntryForm />);

      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });

    it('should show error message', () => {
      useEntriesStore.mockReturnValue({
        addEntry: mockAddEntry,
        updateEntry: mockUpdateEntry,
        isLoading: false,
        error: 'Failed to save entry'
      });

      render(<TimeEntryForm />);

      expect(screen.getByText(/failed to save entry/i)).toBeInTheDocument();
    });
  });

  describe('Form interactions', () => {
    it('should clear form after successful submission', async () => {
      const user = userEvent.setup();
      mockAddEntry.mockResolvedValue({ id: 1 });

      render(<TimeEntryForm onSuccess={() => {}} />);

      // Fill and submit form
      await user.type(screen.getByLabelText(/description/i), 'Test work');
      await user.type(screen.getByLabelText(/hours/i), '1');
      await user.type(screen.getByLabelText(/project/i), 'Project');
      
      const saveButton = screen.getByRole('button', { name: /save entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/description/i)).toHaveValue('');
        expect(screen.getByLabelText(/hours/i)).toHaveValue('');
        expect(screen.getByLabelText(/project/i)).toHaveValue('');
      });
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();
      const user = userEvent.setup();
      mockAddEntry.mockResolvedValue({ id: 1 });

      render(<TimeEntryForm onSuccess={onSuccess} />);

      // Fill and submit form
      await user.type(screen.getByLabelText(/description/i), 'Test work');
      await user.type(screen.getByLabelText(/hours/i), '1');
      await user.type(screen.getByLabelText(/project/i), 'Project');
      
      const saveButton = screen.getByRole('button', { name: /save entry/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({ id: 1 });
      });
    });

    it('should handle cancel action', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();

      render(<TimeEntryForm onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Keyboard navigation', () => {
    it('should support tab navigation', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm />);

      const descriptionInput = screen.getByLabelText(/description/i);
      const hoursInput = screen.getByLabelText(/hours/i);
      const projectInput = screen.getByLabelText(/project/i);

      descriptionInput.focus();
      expect(descriptionInput).toHaveFocus();

      await user.tab();
      expect(hoursInput).toHaveFocus();

      await user.tab();
      expect(projectInput).toHaveFocus();
    });

    it('should submit form on Enter in last field', async () => {
      const user = userEvent.setup();
      render(<TimeEntryForm />);

      // Fill form
      await user.type(screen.getByLabelText(/description/i), 'Test work');
      await user.type(screen.getByLabelText(/hours/i), '1');
      await user.type(screen.getByLabelText(/project/i), 'Project');
      
      // Press Enter in date field
      const dateInput = screen.getByLabelText(/date/i);
      await user.type(dateInput, '2024-01-15{enter}');

      expect(mockAddEntry).toHaveBeenCalled();
    });
  });
});