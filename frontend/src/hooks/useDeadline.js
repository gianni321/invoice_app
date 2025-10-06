import { useState, useEffect } from 'react';
import { api, getAuthHeaders } from '../config';

export function useDeadlineStatus(options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { refreshInterval = 300000 } = options; // default 5min refresh

  const fetchStatus = async () => {
    try {
      const response = await fetch(api.invoices.deadlineStatus(), {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch deadline status');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching deadline status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Set up periodic refresh if requested
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Get status for a specific user
  const getUserStatus = (userId) => {
    if (!data?.statuses) return null;
    return data.statuses.find(s => s.userId === userId) || null;
  };

  // Get current user's status from their profile
  const getMyStatus = (myUserId) => {
    if (!myUserId) return null;
    return getUserStatus(myUserId);
  };

  return {
    loading,
    error,
    data,
    getUserStatus,
    getMyStatus,
    refresh: fetchStatus,
  };
}

export function useDeadlineSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      const response = await fetch(api.admin.getDeadlineSettings(), {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deadline settings');
      }

      const result = await response.json();
      setSettings(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching deadline settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const response = await fetch(api.admin.setDeadlineSettings(), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update deadline settings');
      }

      // Refresh settings
      await fetchSettings();
      return true;
    } catch (err) {
      console.error('Error updating deadline settings:', err);
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    loading,
    error,
    settings,
    updateSettings,
    refresh: fetchSettings,
  };
}