import { VALIDATION_RULES, ERROR_MESSAGES } from '../constants';

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the validation passed
 * @property {string[]} errors - Array of error messages
 * @property {Object} errorFields - Object mapping field names to error messages
 */

/**
 * @typedef {Object} ValidationRule
 * @property {Function} validate - Validation function
 * @property {string} message - Error message
 * @property {boolean} [required] - Whether the field is required
 */

/**
 * Base validation utilities
 */
export class Validator {
  /**
   * Check if value is empty
   * @param {any} value - Value to check
   * @returns {boolean}
   */
  static isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Validate required field
   * @param {any} value - Value to validate
   * @returns {ValidationResult}
   */
  static required(value) {
    const isValid = !this.isEmpty(value);
    return {
      isValid,
      errors: isValid ? [] : [ERROR_MESSAGES.REQUIRED_FIELD],
      errorFields: {}
    };
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {ValidationResult}
   */
  static email(email) {
    if (this.isEmpty(email)) {
      return { isValid: true, errors: [], errorFields: {} };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    return {
      isValid,
      errors: isValid ? [] : [ERROR_MESSAGES.INVALID_EMAIL],
      errorFields: {}
    };
  }

  /**
   * Validate minimum length
   * @param {string} value - Value to validate
   * @param {number} minLength - Minimum length
   * @returns {ValidationResult}
   */
  static minLength(value, minLength) {
    if (this.isEmpty(value)) {
      return { isValid: true, errors: [], errorFields: {} };
    }

    const isValid = value.length >= minLength;
    return {
      isValid,
      errors: isValid ? [] : [`Minimum length is ${minLength} characters`],
      errorFields: {}
    };
  }

  /**
   * Validate maximum length
   * @param {string} value - Value to validate
   * @param {number} maxLength - Maximum length
   * @returns {ValidationResult}
   */
  static maxLength(value, maxLength) {
    if (this.isEmpty(value)) {
      return { isValid: true, errors: [], errorFields: {} };
    }

    const isValid = value.length <= maxLength;
    return {
      isValid,
      errors: isValid ? [] : [`Maximum length is ${maxLength} characters`],
      errorFields: {}
    };
  }

  /**
   * Validate numeric value
   * @param {any} value - Value to validate
   * @returns {ValidationResult}
   */
  static numeric(value) {
    if (this.isEmpty(value)) {
      return { isValid: true, errors: [], errorFields: {} };
    }

    const isValid = !isNaN(value) && !isNaN(parseFloat(value));
    return {
      isValid,
      errors: isValid ? [] : [ERROR_MESSAGES.INVALID_NUMBER],
      errorFields: {}
    };
  }

  /**
   * Validate positive number
   * @param {any} value - Value to validate
   * @returns {ValidationResult}
   */
  static positive(value) {
    if (this.isEmpty(value)) {
      return { isValid: true, errors: [], errorFields: {} };
    }

    const numericResult = this.numeric(value);
    if (!numericResult.isValid) return numericResult;

    const isValid = parseFloat(value) > 0;
    return {
      isValid,
      errors: isValid ? [] : ['Value must be positive'],
      errorFields: {}
    };
  }

  /**
   * Validate date format and validity
   * @param {string} dateString - Date string to validate
   * @returns {ValidationResult}
   */
  static date(dateString) {
    if (this.isEmpty(dateString)) {
      return { isValid: true, errors: [], errorFields: {} };
    }

    const date = new Date(dateString);
    const isValid = date instanceof Date && !isNaN(date);
    
    return {
      isValid,
      errors: isValid ? [] : [ERROR_MESSAGES.INVALID_DATE],
      errorFields: {}
    };
  }

  /**
   * Validate PIN format
   * @param {string} pin - PIN to validate
   * @returns {ValidationResult}
   */
  static pin(pin) {
    if (this.isEmpty(pin)) {
      return {
        isValid: false,
        errors: [ERROR_MESSAGES.REQUIRED_FIELD],
        errorFields: {}
      };
    }

    const isValid = /^\d{4,6}$/.test(pin);
    return {
      isValid,
      errors: isValid ? [] : ['PIN must be 4-6 digits'],
      errorFields: {}
    };
  }
}

/**
 * Form validation schema builder
 */
export class ValidationSchema {
  constructor() {
    this.rules = {};
  }

  /**
   * Add field validation rules
   * @param {string} fieldName - Name of the field
   * @param {ValidationRule[]} rules - Array of validation rules
   * @returns {ValidationSchema}
   */
  field(fieldName, rules) {
    this.rules[fieldName] = rules;
    return this;
  }

  /**
   * Validate form data against schema
   * @param {Object} data - Form data to validate
   * @returns {ValidationResult}
   */
  validate(data) {
    const errors = [];
    const errorFields = {};

    for (const [fieldName, fieldRules] of Object.entries(this.rules)) {
      const fieldValue = data[fieldName];
      const fieldErrors = [];

      for (const rule of fieldRules) {
        const result = rule.validate(fieldValue);
        if (!result.isValid) {
          fieldErrors.push(...result.errors);
        }
      }

      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
        errorFields[fieldName] = fieldErrors[0]; // Use first error for field
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      errorFields
    };
  }
}

/**
 * Pre-built validation rules
 */
export const ValidationRules = {
  required: {
    validate: Validator.required.bind(Validator),
    message: ERROR_MESSAGES.REQUIRED_FIELD
  },

  email: {
    validate: Validator.email.bind(Validator),
    message: ERROR_MESSAGES.INVALID_EMAIL
  },

  pin: {
    validate: Validator.pin.bind(Validator),
    message: 'PIN must be 4-6 digits'
  },

  positiveNumber: {
    validate: Validator.positive.bind(Validator),
    message: 'Value must be a positive number'
  },

  date: {
    validate: Validator.date.bind(Validator),
    message: ERROR_MESSAGES.INVALID_DATE
  },

  minLength: (length) => ({
    validate: (value) => Validator.minLength(value, length),
    message: `Minimum length is ${length} characters`
  }),

  maxLength: (length) => ({
    validate: (value) => Validator.maxLength(value, length),
    message: `Maximum length is ${length} characters`
  }),

  description: {
    validate: (value) => {
      const requiredResult = Validator.required(value);
      if (!requiredResult.isValid) return requiredResult;
      
      return Validator.maxLength(value, VALIDATION_RULES.DESCRIPTION.MAX_LENGTH);
    },
    message: `Description is required and must be less than ${VALIDATION_RULES.DESCRIPTION.MAX_LENGTH} characters`
  },

  hours: {
    validate: (value) => {
      const requiredResult = Validator.required(value);
      if (!requiredResult.isValid) return requiredResult;
      
      const numericResult = Validator.numeric(value);
      if (!numericResult.isValid) return numericResult;
      
      const positiveResult = Validator.positive(value);
      if (!positiveResult.isValid) return positiveResult;
      
      const hours = parseFloat(value);
      const isValid = hours <= VALIDATION_RULES.HOURS.MAX_VALUE;
      
      return {
        isValid,
        errors: isValid ? [] : [`Hours cannot exceed ${VALIDATION_RULES.HOURS.MAX_VALUE}`],
        errorFields: {}
      };
    },
    message: 'Valid hours required'
  },

  tag: {
    validate: (value) => {
      if (Validator.isEmpty(value)) {
        return { isValid: true, errors: [], errorFields: {} };
      }
      
      return Validator.maxLength(value, VALIDATION_RULES.TAG.MAX_LENGTH);
    },
    message: `Tag must be less than ${VALIDATION_RULES.TAG.MAX_LENGTH} characters`
  }
};

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  /**
   * Time entry validation schema
   */
  timeEntry: new ValidationSchema()
    .field('description', [ValidationRules.description])
    .field('hours', [ValidationRules.hours])
    .field('date', [ValidationRules.required, ValidationRules.date])
    .field('tag', [ValidationRules.tag]),

  /**
   * Login validation schema
   */
  login: new ValidationSchema()
    .field('pin', [ValidationRules.pin]),

  /**
   * Settings validation schema
   */
  settings: new ValidationSchema()
    .field('invoiceDeadlineWeeks', [ValidationRules.required, ValidationRules.positiveNumber])
    .field('hourlyRate', [ValidationRules.required, ValidationRules.positiveNumber]),

  /**
   * Tag validation schema
   */
  tag: new ValidationSchema()
    .field('name', [ValidationRules.required, ValidationRules.maxLength(VALIDATION_RULES.TAG.MAX_LENGTH)])
    .field('color', [ValidationRules.required])
};

/**
 * React hook for form validation
 * @param {ValidationSchema} schema - Validation schema
 * @returns {Object} Validation state and methods
 */
export function useValidation(schema) {
  const [errors, setErrors] = React.useState({});
  const [isValid, setIsValid] = React.useState(true);

  const validate = React.useCallback((data) => {
    const result = schema.validate(data);
    setErrors(result.errorFields);
    setIsValid(result.isValid);
    return result;
  }, [schema]);

  const clearErrors = React.useCallback(() => {
    setErrors({});
    setIsValid(true);
  }, []);

  const setFieldError = React.useCallback((fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    setIsValid(false);
  }, []);

  const clearFieldError = React.useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    
    // Check if form is valid after clearing this error
    setIsValid(prev => {
      if (prev) return true;
      return Object.keys(errors).length <= 1; // Will be 0 after this field is removed
    });
  }, [errors]);

  return {
    errors,
    isValid,
    validate,
    clearErrors,
    setFieldError,
    clearFieldError
  };
}

export default Validator;