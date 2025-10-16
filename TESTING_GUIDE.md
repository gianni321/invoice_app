# Testing Infrastructure

This document outlines the comprehensive testing strategy implemented for the Invoice App.

## Overview

The testing infrastructure includes:
- **Unit Tests**: Individual component and service testing
- **Integration Tests**: API endpoint and database testing
- **End-to-End Tests**: Full user workflow testing
- **CI/CD Pipeline**: Automated testing and deployment

## Backend Testing

### Test Structure
```
backend/tests/
├── helpers/
│   └── testDb.js              # Test database utilities
├── services/
│   └── *.test.js              # Service unit tests
├── auth.routes.integration.test.js
├── entries.routes.integration.test.js
└── setup.js                   # Test configuration
```

### Running Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration

# Watch mode for development
npm run test:watch
```

### Test Database
- Uses SQLite in-memory database for fast, isolated tests
- Automatic setup/teardown for each test
- Test data generators for consistent fixtures
- Transaction rollback for test isolation

## Frontend Testing

### Test Structure
```
frontend/src/test/
├── *.test.jsx                 # Component tests
├── setup.js                   # Test configuration
└── __mocks__/                 # Mock implementations
```

### Testing Stack
- **Vitest**: Fast test runner with native ES modules support
- **React Testing Library**: Component testing utilities
- **Jest DOM**: Custom matchers for DOM testing
- **Playwright**: End-to-end browser testing

### Running Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run tests in UI mode
npm run test:ui

# E2E tests
npm run test:e2e
```

## End-to-End Testing

### Playwright Configuration
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile device simulation
- Automatic screenshot/video capture on failures
- Parallel test execution

### Test Categories
1. **Authentication Flow**
   - Login/logout functionality
   - Registration process
   - Password validation
   - Session management

2. **Time Entry Management**
   - Creating new entries
   - Editing existing entries
   - Deleting entries
   - Bulk operations

3. **Invoice Generation**
   - Form validation
   - PDF generation
   - Download functionality
   - Preview display

### Running E2E Tests
```bash
cd frontend

# Run all E2E tests
npm run test:e2e

# Run specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

## CI/CD Pipeline

### GitHub Actions Workflow
The `.github/workflows/ci-cd.yml` file defines a comprehensive pipeline:

1. **Lint and Code Quality**
   - ESLint for code standards
   - Prettier for formatting
   - TypeScript type checking

2. **Security Scanning**
   - npm audit for vulnerabilities
   - Snyk security analysis
   - Dependency vulnerability checks

3. **Testing**
   - Backend unit and integration tests
   - Frontend component tests
   - End-to-end testing
   - Coverage reporting

4. **Build and Deploy**
   - Docker image building
   - Multi-platform support
   - Staging/production deployment

### Triggering Tests
Tests run automatically on:
- Pull requests to main/develop
- Pushes to main/develop branches
- Manual workflow dispatch

## Test Coverage

### Coverage Goals
- **Unit Tests**: >90% code coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user workflows

### Coverage Reports
- Generated in HTML format
- Uploaded to Codecov
- Coverage badges in README
- Trend tracking over time

## Testing Best Practices

### Unit Tests
```javascript
describe('Component/Service Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  test('should do something specific', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Component Testing
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('should handle user interaction', async () => {
  const user = userEvent.setup();
  render(<Component />);
  
  await user.click(screen.getByRole('button'));
  
  expect(screen.getByText('Expected result')).toBeInTheDocument();
});
```

### API Testing
```javascript
test('should create entry with valid data', async () => {
  const response = await request(app)
    .post('/api/entries')
    .set('Authorization', `Bearer ${token}`)
    .send(validData)
    .expect(201);

  expect(response.body).toMatchObject(expectedShape);
});
```

## Debugging Tests

### Backend Tests
```bash
# Debug specific test
npm test -- --testNamePattern="specific test name"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Frontend Tests
```bash
# Debug in browser
npm run test:ui

# Debug specific test
npm test -- --reporter=verbose specific-test.test.jsx
```

### E2E Tests
```bash
# Debug mode with browser UI
npx playwright test --debug

# Trace viewer for failed tests
npx playwright show-trace test-results/trace.zip
```

## Mock Strategies

### API Mocking
- MSW (Mock Service Worker) for HTTP requests
- In-memory database for integration tests
- Fixture data for consistent testing

### Component Mocking
- Jest/Vitest mocks for dependencies
- Mock implementations for external services
- Stub functions for side effects

## Continuous Integration

### Quality Gates
- All tests must pass
- Coverage thresholds must be met
- No security vulnerabilities
- Code quality standards enforced

### Performance Testing
- Bundle size analysis
- Lighthouse scores
- Load testing for APIs
- Memory leak detection

## Local Development

### Quick Start
```bash
# Install dependencies
npm install

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- TimeEntryForm.test.jsx
```

### IDE Integration
- VS Code testing extensions
- IntelliSense for test utilities
- Breakpoint debugging
- Test runner integration

## Troubleshooting

### Common Issues
1. **Test timeouts**: Increase timeout for async operations
2. **DOM cleanup**: Use proper cleanup in afterEach
3. **Mock persistence**: Clear mocks between tests
4. **Async testing**: Use proper waiting strategies

### Environment Variables
```bash
# Test environment
NODE_ENV=test

# Database configuration
DB_TYPE=sqlite
DB_NAME=:memory:

# Authentication
JWT_SECRET=test-secret-key
```

## Future Enhancements

### Planned Improvements
- Visual regression testing
- Performance benchmarking
- Accessibility testing automation
- Contract testing with Pact
- Mutation testing for test quality

### Monitoring
- Test execution metrics
- Flaky test detection
- Performance regression alerts
- Coverage trend analysis