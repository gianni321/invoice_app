const BaseService = require('./BaseService');

/**
 * Settings service for handling application settings
 */
class SettingsService extends BaseService {
  constructor() {
    super('settings');
  }

  /**
   * Get setting by key
   * @param {string} key 
   * @returns {Promise<string|null>}
   */
  async getSetting(key) {
    const result = await this.get('SELECT value FROM settings WHERE key = ?', [key]);
    return result ? result.value : null;
  }

  /**
   * Set a setting value
   * @param {string} key 
   * @param {string} value 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async setSetting(key, value) {
    const existing = await this.get('SELECT id FROM settings WHERE key = ?', [key]);
    
    if (existing) {
      return await this.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
    } else {
      return await this.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  /**
   * Get all settings as key-value pairs
   * @returns {Promise<Object>}
   */
  async getAllSettings() {
    const rows = await this.query('SELECT key, value FROM settings');
    const settings = {};
    
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    
    return settings;
  }

  /**
   * Get multiple settings by keys
   * @param {Array} keys 
   * @returns {Promise<Object>}
   */
  async getSettings(keys) {
    if (!keys || keys.length === 0) return {};
    
    const placeholders = keys.map(() => '?').join(',');
    const sql = `SELECT key, value FROM settings WHERE key IN (${placeholders})`;
    const rows = await this.query(sql, keys);
    
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    
    return settings;
  }

  /**
   * Set multiple settings at once
   * @param {Object} settings 
   * @returns {Promise<Array>}
   */
  async setSettings(settings) {
    const results = [];
    
    for (const [key, value] of Object.entries(settings)) {
      const result = await this.setSetting(key, value);
      results.push({ key, ...result });
    }
    
    return results;
  }

  /**
   * Delete a setting
   * @param {string} key 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async deleteSetting(key) {
    return await this.run('DELETE FROM settings WHERE key = ?', [key]);
  }

  /**
   * Get invoice-related settings with defaults
   * @returns {Promise<Object>}
   */
  async getInvoiceSettings() {
    const settings = await this.getAllSettings();
    
    return {
      warnWindowHours: parseInt(settings.warnWindowHours || '48'),
      deadlineDay: parseInt(settings.deadlineDay || '2'), // Tuesday = 2
      deadlineHour: parseInt(settings.deadlineHour || '23'),
      deadlineMinute: parseInt(settings.deadlineMinute || '59'),
      timezone: settings.timezone || 'America/New_York'
    };
  }

  /**
   * Update invoice settings
   * @param {Object} invoiceSettings 
   * @returns {Promise<Array>}
   */
  async updateInvoiceSettings(invoiceSettings) {
    const allowedKeys = ['warnWindowHours', 'deadlineDay', 'deadlineHour', 'deadlineMinute', 'timezone'];
    const filteredSettings = {};
    
    for (const [key, value] of Object.entries(invoiceSettings)) {
      if (allowedKeys.includes(key)) {
        filteredSettings[key] = String(value);
      }
    }
    
    return await this.setSettings(filteredSettings);
  }
}

module.exports = new SettingsService();