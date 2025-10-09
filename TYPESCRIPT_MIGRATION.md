# TypeScript Migration Guide

## Overview
This guide outlines the step-by-step process for migrating the invoice application from JavaScript to TypeScript.

## Migration Strategy

### Phase 1: Setup and Configuration ✅
- [x] Install TypeScript and type definitions
- [x] Configure `tsconfig.json` with appropriate settings
- [x] Update Vite configuration for TypeScript support
- [x] Create comprehensive type definitions in `src/types/index.ts`

### Phase 2: Core Types and Utilities (Next Steps)
- [ ] Convert utility functions (`src/utils/`)
- [ ] Convert service layers (`src/services/`)
- [ ] Convert custom hooks (`src/hooks/`)
- [ ] Convert Zustand stores (`src/stores/`)

### Phase 3: Component Migration
- [ ] Convert common/shared components first
- [ ] Convert page components
- [ ] Convert the main App component
- [ ] Update component imports and exports

### Phase 4: Configuration and Build
- [ ] Update build scripts for TypeScript
- [ ] Configure ESLint for TypeScript
- [ ] Update test configurations for TypeScript
- [ ] Add TypeScript checking to CI/CD

## File Migration Checklist

### Already Migrated
- ✅ `frontend/tsconfig.json` - TypeScript configuration
- ✅ `frontend/src/types/index.ts` - Comprehensive type definitions
- ✅ `frontend/vite.config.js` - Updated with path aliases
- ✅ `frontend/package.json` - Added TypeScript dependencies

### Ready for Migration

#### Utilities (Priority: High)
- [ ] `src/utils/dateUtils.js` → `src/utils/dateUtils.ts`
- [ ] `src/utils/validation.js` → `src/utils/validation.ts`
- [ ] `src/utils/format.js` → `src/utils/format.ts`
- [ ] `src/utils/monitoring.js` → `src/utils/monitoring.ts`

#### Services (Priority: High)
- [ ] `src/services/ApiService.js` → `src/services/ApiService.ts`
- [ ] `src/services/AuthService.js` → `src/services/AuthService.ts`

#### Stores (Priority: High)
- [ ] `src/stores/entriesStore.js` → `src/stores/entriesStore.ts`

#### Hooks (Priority: Medium)
- [ ] `src/hooks/useForm.js` → `src/hooks/useForm.ts`
- [ ] `src/hooks/useDeadline.js` → `src/hooks/useDeadline.ts`

#### Components (Priority: Medium)
- [ ] `src/components/common/` - Convert shared components first
- [ ] `src/components/Invoice/` - Convert Invoice components
- [ ] `src/components/TimeEntry/` - Convert TimeEntry components
- [ ] `src/components/*.jsx` - Convert remaining components

#### Main Application (Priority: Low)
- [ ] `src/App.jsx` → `src/App.tsx`
- [ ] `src/main.jsx` → `src/main.tsx`
- [ ] `src/config.js` → `src/config.ts`

## Migration Commands

### Install TypeScript Dependencies
```bash
npm install --save-dev typescript @types/react @types/react-dom @types/node @types/jest
```

### Type Check Without Building
```bash
npx tsc --noEmit
```

### Rename Files (PowerShell)
```powershell
# Rename utilities
Rename-Item "src/utils/dateUtils.js" "src/utils/dateUtils.ts"
Rename-Item "src/utils/validation.js" "src/utils/validation.ts"
Rename-Item "src/utils/format.js" "src/utils/format.ts"

# Rename services
Rename-Item "src/services/ApiService.js" "src/services/ApiService.ts"
Rename-Item "src/services/AuthService.js" "src/services/AuthService.ts"

# Rename stores
Rename-Item "src/stores/entriesStore.js" "src/stores/entriesStore.ts"
```

## Type Safety Benefits

### Current Issues Addressed
1. **Runtime Errors**: Catch property access errors at compile time
2. **API Response Types**: Ensure correct handling of API responses
3. **Component Props**: Validate component prop types
4. **State Management**: Type-safe Zustand stores
5. **Form Validation**: Type-safe form handling

### Development Benefits
1. **IntelliSense**: Better autocomplete and code suggestions
2. **Refactoring**: Safer code refactoring with type checking
3. **Documentation**: Types serve as living documentation
4. **Error Prevention**: Catch errors before runtime
5. **Team Collaboration**: Clear interfaces and contracts

## Migration Best Practices

### 1. Start with Type Definitions
- Define all interfaces and types first
- Use union types for string constants
- Create generic types for reusable patterns

### 2. Enable Strict Mode Gradually
```typescript
// Start with less strict settings
"strict": false,
"noImplicitAny": false,

// Gradually enable stricter checks
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true,
```

### 3. Use Type Assertions Sparingly
```typescript
// Avoid
const data = response as ApiResponse;

// Prefer type guards
function isApiResponse(data: unknown): data is ApiResponse {
  return typeof data === 'object' && data !== null && 'success' in data;
}
```

### 4. Leverage Utility Types
```typescript
// Create update types automatically
type UpdateInvoice = Partial<Pick<Invoice, 'status' | 'notes'>>;

// Create form types from main types
type InvoiceForm = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;
```

## Path Aliases Configuration

The following path aliases are configured for cleaner imports:

```typescript
// Instead of relative imports
import { ApiService } from '../../../services/ApiService';

// Use absolute imports
import { ApiService } from '@/services/ApiService';
```

Available aliases:
- `@/` → `./src/`
- `@/components/` → `./src/components/`
- `@/utils/` → `./src/utils/`
- `@/services/` → `./src/services/`
- `@/stores/` → `./src/stores/`
- `@/hooks/` → `./src/hooks/`
- `@/types/` → `./src/types/`

## Testing with TypeScript

### Test File Extensions
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### Type-Safe Testing
```typescript
import { render, screen } from '@testing-library/react';
import { Invoice } from '@/types';
import InvoiceComponent from '@/components/Invoice/InvoiceModal';

const mockInvoice: Invoice = {
  id: 'test-id',
  status: 'sent',
  // ... other required properties
};

test('renders invoice modal', () => {
  render(<InvoiceComponent invoice={mockInvoice} onClose={() => {}} />);
  expect(screen.getByText('Invoice Details')).toBeInTheDocument();
});
```

## Common TypeScript Patterns

### Component Props with Default Values
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md',
  onClick 
}) => {
  // Component implementation
};
```

### API Service with Typed Responses
```typescript
class ApiService {
  async getInvoices(): Promise<ApiResponse<Invoice[]>> {
    const response = await fetch('/api/invoices');
    return response.json();
  }
  
  async createInvoice(data: CreateData<Invoice>): Promise<ApiResponse<Invoice>> {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  }
}
```

### Zustand Store with TypeScript
```typescript
interface EntriesState {
  entries: TimeEntry[];
  loading: boolean;
  error: string | null;
  addEntry: (entry: CreateData<TimeEntry>) => Promise<void>;
  updateEntry: (id: string, data: UpdateData<TimeEntry>) => Promise<void>;
}

const useEntriesStore = create<EntriesState>((set, get) => ({
  entries: [],
  loading: false,
  error: null,
  
  addEntry: async (entryData) => {
    set({ loading: true });
    try {
      const response = await ApiService.createEntry(entryData);
      if (response.success) {
        set(state => ({ 
          entries: [...state.entries, response.data],
          loading: false 
        }));
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));
```

## Next Steps

1. **Run TypeScript Installation**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start Converting Files**:
   Begin with utility functions and services as they have the highest impact.

3. **Enable Type Checking**:
   ```bash
   npx tsc --noEmit
   ```

4. **Update Build Scripts**:
   Add TypeScript checking to the build process.

5. **Configure IDE**:
   Ensure VS Code is configured for TypeScript support with proper extensions.

## Troubleshooting

### Common Issues

1. **Module Resolution Errors**:
   Ensure path aliases are correctly configured in both `tsconfig.json` and `vite.config.js`.

2. **Type Declaration Errors**:
   Install missing type packages: `npm install --save-dev @types/package-name`

3. **Build Errors**:
   Check that all TypeScript files compile without errors before building.

4. **Import/Export Issues**:
   Verify that all imports use correct file extensions (.ts/.tsx) or are properly aliased.

This migration will significantly improve code quality, developer experience, and maintainability of the invoice application.