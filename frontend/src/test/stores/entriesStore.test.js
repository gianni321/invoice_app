import { renderHook, act } from '@testing-library/react';
import { useEntriesStore } from '../../stores/entriesStore';
import { toast } from 'react-toastify';

// Mock dependencies
jest.mock('react-toastify');
jest.mock('../../config', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  getAuthHeaders: jest.fn(() => ({ Authorization: 'Bearer test-token' }))
}));

const mockApi = require('../../config').api;

describe('useEntriesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useEntriesStore.setState({
      entries: [],
      isLoading: false,
      error: null,
      filters: {
        scope: 'all',
        dateRange: null
      }
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useEntriesStore());

      expect(result.current.entries).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.filters).toEqual({
        scope: 'all',
        dateRange: null
      });
    });
  });

  describe('Actions', () => {
    describe('fetchEntries', () => {
      it('sets loading state during fetch', async () => {
        const { result } = renderHook(() => useEntriesStore());
        
        mockApi.get.mockReturnValue(new Promise(() => {})); // Never resolves

        act(() => {
          result.current.fetchEntries();
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.error).toBeNull();
      });

      it('updates entries on successful fetch', async () => {
        const mockEntries = [
          { id: 1, hours: 8, task: 'Development', date: '2025-10-09' },
          { id: 2, hours: 4, task: 'Meeting', date: '2025-10-08' }
        ];

        mockApi.get.mockResolvedValue({ data: mockEntries });

        const { result } = renderHook(() => useEntriesStore());

        await act(async () => {
          await result.current.fetchEntries();
        });

        expect(result.current.entries).toEqual(mockEntries);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      it('sets error state on failed fetch', async () => {
        const errorMessage = 'Failed to fetch entries';
        mockApi.get.mockRejectedValue(new Error(errorMessage));

        const { result } = renderHook(() => useEntriesStore());

        await act(async () => {
          try {
            await result.current.fetchEntries();
          } catch (error) {
            // Expected to throw
          }
        });

        expect(result.current.entries).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(errorMessage);
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });

      it('includes scope filter in request', async () => {
        const { result } = renderHook(() => useEntriesStore());

        act(() => {
          result.current.setFilters({ scope: 'open' });
        });

        mockApi.get.mockResolvedValue({ data: [] });

        await act(async () => {
          await result.current.fetchEntries();
        });

        expect(mockApi.get).toHaveBeenCalledWith(
          '/entries?scope=open',
          expect.any(Object)
        );
      });
    });

    describe('createEntry', () => {
      it('adds new entry to state on successful creation', async () => {
        const newEntry = { id: 3, hours: 6, task: 'Testing', date: '2025-10-09' };
        mockApi.post.mockResolvedValue({ data: newEntry });

        const { result } = renderHook(() => useEntriesStore());

        // Set initial entries
        act(() => {
          result.current.setEntries([
            { id: 1, hours: 8, task: 'Development', date: '2025-10-09' }
          ]);
        });

        await act(async () => {
          await result.current.createEntry({
            hours: 6,
            task: 'Testing',
            date: '2025-10-09'
          });
        });

        expect(result.current.entries).toHaveLength(2);
        expect(result.current.entries[0]).toEqual(newEntry); // New entry should be first
      });

      it('handles creation error', async () => {
        mockApi.post.mockRejectedValue(new Error('Creation failed'));

        const { result } = renderHook(() => useEntriesStore());

        await act(async () => {
          try {
            await result.current.createEntry({
              hours: 6,
              task: 'Testing',
              date: '2025-10-09'
            });
          } catch (error) {
            expect(error.message).toBe('Creation failed');
          }
        });
      });
    });

    describe('updateEntry', () => {
      it('updates existing entry in state', async () => {
        const updatedEntry = { id: 1, hours: 10, task: 'Updated Development', date: '2025-10-09' };
        mockApi.put.mockResolvedValue({ data: updatedEntry });

        const { result } = renderHook(() => useEntriesStore());

        // Set initial entries
        act(() => {
          result.current.setEntries([
            { id: 1, hours: 8, task: 'Development', date: '2025-10-09' },
            { id: 2, hours: 4, task: 'Meeting', date: '2025-10-08' }
          ]);
        });

        await act(async () => {
          await result.current.updateEntry(1, { hours: 10, task: 'Updated Development' });
        });

        const updatedEntryInState = result.current.entries.find(e => e.id === 1);
        expect(updatedEntryInState).toEqual(updatedEntry);
      });
    });

    describe('deleteEntry', () => {
      it('removes entry from state on successful deletion', async () => {
        mockApi.delete.mockResolvedValue({});

        const { result } = renderHook(() => useEntriesStore());

        // Set initial entries
        act(() => {
          result.current.setEntries([
            { id: 1, hours: 8, task: 'Development', date: '2025-10-09' },
            { id: 2, hours: 4, task: 'Meeting', date: '2025-10-08' }
          ]);
        });

        await act(async () => {
          await result.current.deleteEntry(1);
        });

        expect(result.current.entries).toHaveLength(1);
        expect(result.current.entries[0].id).toBe(2);
      });
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useEntriesStore());
      
      act(() => {
        result.current.setEntries([
          { id: 1, hours: 8, task: 'Development', date: '2025-10-09', invoiceId: null },
          { id: 2, hours: 4, task: 'Meeting', date: '2025-10-08', invoiceId: 1 },
          { id: 3, hours: 6, task: 'Testing', date: '2025-10-09', invoiceId: null }
        ]);
      });
    });

    describe('getOpenEntries', () => {
      it('returns only entries without invoiceId', () => {
        const { result } = renderHook(() => useEntriesStore());
        
        const openEntries = result.current.getOpenEntries();
        
        expect(openEntries).toHaveLength(2);
        expect(openEntries.every(entry => !entry.invoiceId)).toBe(true);
      });
    });

    describe('getEntriesByDate', () => {
      it('returns entries for specific date', () => {
        const { result } = renderHook(() => useEntriesStore());
        
        const entriesForDate = result.current.getEntriesByDate('2025-10-09');
        
        expect(entriesForDate).toHaveLength(2);
        expect(entriesForDate.every(entry => entry.date === '2025-10-09')).toBe(true);
      });
    });

    describe('getTotalHours', () => {
      it('calculates total hours for filtered entries', () => {
        const { result } = renderHook(() => useEntriesStore());
        
        const totalHours = result.current.getTotalHours();
        
        expect(totalHours).toBe(18); // 8 + 4 + 6
      });
    });

    describe('getEntryStats', () => {
      it('returns correct statistics', () => {
        const { result } = renderHook(() => useEntriesStore());
        
        const stats = result.current.getEntryStats();
        
        expect(stats.totalEntries).toBe(3);
        expect(stats.totalHours).toBe(18);
        expect(stats.openEntries).toBe(2);
        expect(stats.invoicedEntries).toBe(1);
      });
    });
  });

  describe('Filters', () => {
    it('updates filters correctly', () => {
      const { result } = renderHook(() => useEntriesStore());

      act(() => {
        result.current.setFilters({ scope: 'open' });
      });

      expect(result.current.filters.scope).toBe('open');
      expect(result.current.filters.dateRange).toBeNull(); // Other filters preserved
    });

    it('filters entries correctly with getFilteredEntries', () => {
      const { result } = renderHook(() => useEntriesStore());

      act(() => {
        result.current.setEntries([
          { id: 1, hours: 8, task: 'Development', date: '2025-10-09', invoiceId: null },
          { id: 2, hours: 4, task: 'Meeting', date: '2025-10-08', invoiceId: 1 }
        ]);
        result.current.setFilters({ scope: 'open' });
      });

      const filteredEntries = result.current.getFilteredEntries();
      
      expect(filteredEntries).toHaveLength(1);
      expect(filteredEntries[0].id).toBe(1);
    });
  });
});