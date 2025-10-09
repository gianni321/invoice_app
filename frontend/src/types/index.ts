/**
 * @fileoverview TypeScript type definitions for the invoice application
 */

import { ReactNode, ComponentType } from 'react';

/**
 * User authentication and profile types
 */
export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

/**
 * Authentication state and tokens
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Time entry data structure
 */
export interface TimeEntry {
  id: string;
  userId: string;
  hours: number;
  task: string;
  notes?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  tag?: string;
  createdAt: string;
  updatedAt: string;
  invoiceId?: string;
  isInvoiced: boolean;
}

/**
 * Time entry form data (before submission)
 */
export interface TimeEntryFormData {
  hours: string;
  task: string;
  notes: string;
  date: string;
  tag: string;
}

/**
 * Time entry validation errors
 */
export interface TimeEntryErrors {
  hours?: string;
  task?: string;
  notes?: string;
  date?: string;
  tag?: string;
}

/**
 * Invoice status enumeration
 */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/**
 * Invoice data structure
 */
export interface Invoice {
  id: string;
  userId: string;
  userName?: string;
  user?: User;
  date: string; // ISO date string
  status: InvoiceStatus;
  totalHours: number;
  totalAmount: number;
  hourlyRate: number;
  description?: string;
  notes?: string;
  dueDate?: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
  entries?: TimeEntry[];
}

/**
 * Invoice form data
 */
export interface InvoiceFormData {
  userId: string;
  description: string;
  notes: string;
  hourlyRate: number;
  dueDate: string;
  entryIds: string[];
}

/**
 * Invoice validation errors
 */
export interface InvoiceErrors {
  userId?: string;
  description?: string;
  hourlyRate?: string;
  dueDate?: string;
  entryIds?: string;
}

/**
 * Application settings
 */
export interface AppSettings {
  defaultHourlyRate: number;
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    deadlines: boolean;
    invoiceUpdates: boolean;
    paymentReminders: boolean;
  };
  deadlineWarning: {
    enabled: boolean;
    daysBeforeDeadline: number;
  };
}

/**
 * Deadline configuration
 */
export interface DeadlineConfig {
  enabled: boolean;
  daysBeforeDeadline: number;
  reminderEmails: boolean;
  blockNewEntries: boolean;
}

/**
 * Deadline status
 */
export interface DeadlineStatus {
  hasActiveDeadline: boolean;
  daysRemaining: number;
  deadlineDate: string | null;
  isOverdue: boolean;
  warningLevel: 'none' | 'warning' | 'critical' | 'overdue';
}

/**
 * Analytics data types
 */
export interface AnalyticsData {
  totalInvoices: number;
  totalRevenue: number;
  totalHours: number;
  averageHourlyRate: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    hours: number;
    invoices: number;
  }>;
  topTasks: Array<{
    task: string;
    hours: number;
    count: number;
  }>;
  invoiceStatusDistribution: Record<InvoiceStatus, number>;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Filter options for time entries
 */
export interface TimeEntryFilters {
  startDate?: string;
  endDate?: string;
  tag?: string;
  task?: string;
  isInvoiced?: boolean;
  userId?: string;
}

/**
 * Filter options for invoices
 */
export interface InvoiceFilters {
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Form state management
 */
export interface FormState<T> {
  data: T;
  errors: Record<keyof T, string>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

/**
 * Loading state for different operations
 */
export interface LoadingState {
  entries: boolean;
  invoices: boolean;
  settings: boolean;
  analytics: boolean;
  authentication: boolean;
}

/**
 * Error state for different operations
 */
export interface ErrorState {
  entries: string | null;
  invoices: string | null;
  settings: string | null;
  analytics: string | null;
  authentication: string | null;
}

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification
 */
export interface ToastNotification {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

/**
 * Component props for common patterns
 */
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Modal component props
 */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Button component props
 */
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Input component props
 */
export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Select option
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Select component props
 */
export interface SelectProps extends BaseComponentProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Table column definition
 */
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (item: T, value: any) => ReactNode;
  width?: string;
}

/**
 * Table component props
 */
export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationParams;
  onSort?: (key: keyof T, order: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  className?: string;
}

/**
 * Route parameters
 */
export interface RouteParams {
  id?: string;
  [key: string]: string | undefined;
}

/**
 * Navigation item
 */
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: ComponentType;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

/**
 * Environment configuration
 */
export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  REACT_APP_API_URL: string;
  REACT_APP_MONITORING_ENDPOINT?: string;
  REACT_APP_SENTRY_DSN?: string;
}

/**
 * Utility type for making all properties optional except specified ones
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Utility type for making all properties required except specified ones
 */
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;

/**
 * Utility type for creating update objects (all fields optional)
 */
export type UpdateData<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Utility type for creating new objects (without generated fields)
 */
export type CreateData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;