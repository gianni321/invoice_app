const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs').promises;

/**
 * Secure CSV export utility
 * Properly escapes user data and prevents injection attacks
 */
class SecureCsvExporter {
  /**
   * Export invoice data to CSV with proper escaping
   * @param {Array} invoiceData - Array of invoice objects
   * @param {string} filename - Output filename
   * @returns {Promise<string>} - Path to generated CSV file
   */
  static async exportInvoices(invoiceData, filename = 'invoices.csv') {
    const csvWriter = createCsvWriter({
      path: path.join(__dirname, '..', 'temp', filename),
      header: [
        { id: 'id', title: 'Invoice ID' },
        { id: 'user_name', title: 'User Name' },
        { id: 'period_start', title: 'Period Start' },
        { id: 'period_end', title: 'Period End' },
        { id: 'total', title: 'Total Amount' },
        { id: 'status', title: 'Status' },
        { id: 'submitted_at', title: 'Submitted Date' },
        { id: 'approved_at', title: 'Approved Date' },
        { id: 'paid_at', title: 'Paid Date' }
      ]
    });

    // Sanitize data to prevent CSV injection
    const sanitizedData = invoiceData.map(invoice => ({
      id: this.sanitizeCsvField(invoice.id),
      user_name: this.sanitizeCsvField(invoice.user_name),
      period_start: this.sanitizeCsvField(invoice.period_start),
      period_end: this.sanitizeCsvField(invoice.period_end),
      total: this.sanitizeCsvField(invoice.total),
      status: this.sanitizeCsvField(invoice.status),
      submitted_at: this.sanitizeCsvField(invoice.submitted_at),
      approved_at: this.sanitizeCsvField(invoice.approved_at),
      paid_at: this.sanitizeCsvField(invoice.paid_at)
    }));

    await csvWriter.writeRecords(sanitizedData);
    return path.join(__dirname, '..', 'temp', filename);
  }

  /**
   * Export time entries to CSV with proper escaping
   * @param {Array} entriesData - Array of time entry objects
   * @param {string} filename - Output filename
   * @returns {Promise<string>} - Path to generated CSV file
   */
  static async exportEntries(entriesData, filename = 'entries.csv') {
    const csvWriter = createCsvWriter({
      path: path.join(__dirname, '..', 'temp', filename),
      header: [
        { id: 'id', title: 'Entry ID' },
        { id: 'user_name', title: 'User Name' },
        { id: 'date', title: 'Date' },
        { id: 'hours', title: 'Hours' },
        { id: 'description', title: 'Description' },
        { id: 'tag', title: 'Tag' },
        { id: 'rate', title: 'Rate' },
        { id: 'total', title: 'Total' },
        { id: 'invoice_id', title: 'Invoice ID' }
      ]
    });

    // Sanitize data to prevent CSV injection
    const sanitizedData = entriesData.map(entry => ({
      id: this.sanitizeCsvField(entry.id),
      user_name: this.sanitizeCsvField(entry.user_name),
      date: this.sanitizeCsvField(entry.date),
      hours: this.sanitizeCsvField(entry.hours),
      description: this.sanitizeCsvField(entry.description),
      tag: this.sanitizeCsvField(entry.tag),
      rate: this.sanitizeCsvField(entry.rate),
      total: this.sanitizeCsvField(entry.total),
      invoice_id: this.sanitizeCsvField(entry.invoice_id)
    }));

    await csvWriter.writeRecords(sanitizedData);
    return path.join(__dirname, '..', 'temp', filename);
  }

  /**
   * Sanitize CSV field to prevent injection attacks
   * @param {any} field - Field value to sanitize
   * @returns {string} - Sanitized field value
   */
  static sanitizeCsvField(field) {
    if (field === null || field === undefined) {
      return '';
    }

    let sanitized = String(field);
    
    // Remove dangerous characters that could be interpreted as formulas
    // Excel and other spreadsheet apps can execute formulas starting with =, +, -, @
    if (sanitized.match(/^[=+\-@]/)) {
      sanitized = "'" + sanitized; // Prefix with single quote to treat as text
    }

    // Remove any control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    return sanitized;
  }

  /**
   * Clean up temporary CSV files
   * @param {string} filePath - Path to file to delete
   */
  static async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error cleaning up temp file:', error);
    }
  }

  /**
   * Ensure temp directory exists
   */
  static async ensureTempDir() {
    const tempDir = path.join(__dirname, '..', 'temp');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

module.exports = SecureCsvExporter;