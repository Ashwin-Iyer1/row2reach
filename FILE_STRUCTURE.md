# Project File Structure

This document describes the refactored file structure of the Row 2 Reach application.

## Directory Structure

```
electron-app/
├── src/                          # Source code directory
│   ├── api/                      # API integration modules
│   │   ├── apollo-api.js         # Apollo.io API integration
│   │   ├── contactout-api.js     # ContactOut API integration
│   │   └── zerobounce-api.js     # ZeroBounce API integration
│   │
│   ├── handlers/                 # Event handlers
│   │   └── event-handlers.js     # Button click and page event handlers
│   │
│   ├── state/                    # State management
│   │   └── app-state.js          # Global application state
│   │
│   ├── utils/                    # Utility functions
│   │   ├── csv-utils.js          # CSV parsing and manipulation
│   │   ├── dom-utils.js          # DOM manipulation helpers
│   │   └── table-builder.js      # HTML table construction
│   │
│   └── main.js                   # Main entry point
│
├── App/                          # Authentication configuration
│   ├── authConfig.js
│   ├── AuthProvider.js
│   └── constants.js
│
├── data/                         # Configuration files
│   ├── config.json
│   └── config.json.example
│
├── app.js                        # Electron main process
├── preload.js                    # Electron preload script
├── file-input.js                 # File input handler
├── emails-buttons.js             # Email functionality
├── index.html                    # Main HTML page
├── emails.html                   # Email sending page
├── styles.css                    # Application styles
├── package.json                  # Node.js dependencies
└── README.md                     # This file
```

## Module Descriptions

### API Modules (`src/api/`)

#### `apollo-api.js`
- Handles Apollo.io API integration
- Functions:
  - `getApolloDetailsFromCsvRows()` - Extract contact details from CSV
  - `buildApolloRequest()` - Build API request configuration
  - `applyApolloMatchesToCsv()` - Apply API results to CSV
  - `fetchApollo()` - Main Apollo fetch function with chunking (10 rows per request)

#### `contactout-api.js`
- Handles ContactOut API integration
- Functions:
  - `extractLinkedinProfiles()` - Extract LinkedIn URLs from CSV
  - `buildContactOutRequest()` - Build API request configuration
  - `applyContactOutResultsToCsv()` - Apply API results to CSV
  - `fetchContactOut()` - Main ContactOut fetch function

#### `zerobounce-api.js`
- Handles ZeroBounce API integration
- Functions:
  - `buildZeroBounceFormData()` - Build form data for file upload
  - `applyZeroBounceResultsToCsv()` - Apply API results to CSV
  - `fetchZeroBounce()` - Main ZeroBounce fetch function

### Handler Modules (`src/handlers/`)

#### `event-handlers.js`
- Manages all button click events and page lifecycle
- Functions:
  - `validateCsvLoaded()` - Validate CSV data exists
  - `downloadCsvFile()` - Handle CSV download
  - `navigateToEmailPage()` - Navigate to email page
  - `initializeEventListeners()` - Setup all button listeners
  - `initializePageLoadHandler()` - Setup page load behavior

### State Management (`src/state/`)

#### `app-state.js`
- Manages global application state
- Variables:
  - `csvRows` - Original CSV data
  - `enrichedCsvData` - Enriched CSV data with API results
- Functions:
  - `getCsvRows()` / `setCsvRows()` - Access CSV rows
  - `getEnrichedCsvData()` / `setEnrichedCsvData()` - Access enriched data
  - `initializeStateListeners()` - Setup state event listeners

### Utility Modules (`src/utils/`)

#### `csv-utils.js`
- CSV parsing and manipulation utilities
- Functions:
  - `normalizeCsvRows()` - Normalize CSV input
  - `rowsToCsvString()` - Convert rows to CSV string
  - `parseRowColumns()` - Parse CSV row into columns
  - `parseHeaders()` - Parse and normalize headers
  - `findColumnIndex()` - Find column by keyword
  - `ensureHeader()` - Ensure header exists
  - `setEmailInRow()` - Set email at specific column
  - `extractEmailsFromCsv()` - Extract emails from enriched data

#### `dom-utils.js`
- DOM manipulation helpers
- Functions:
  - `replaceText()` - Update element text content
  - `getElementSafely()` - Safe element retrieval with warnings
  - `toggleButtonVisibility()` - Show/hide buttons

#### `table-builder.js`
- HTML table construction and rendering
- Functions:
  - `createTableHeader()` - Create table header
  - `createTableRow()` - Create single table row
  - `createTableBody()` - Create table body
  - `buildTableFromRows()` - Build complete table
  - `renderTable()` - Render table to DOM
  - `displayCsvAsTable()` - Public function to display CSV as table

### Main Entry Point (`src/main.js`)

- Initializes all modules
- Sets up state management
- Registers event listeners
- Exposes `displayCsvAsTable` globally for file-input.js

## Benefits of This Structure

### 1. **Modularity**
- Each file has a single, clear responsibility
- Easy to locate specific functionality
- Modules can be tested independently

### 2. **Maintainability**
- Changes to one API don't affect others
- Easy to add new API integrations
- Clear separation of concerns

### 3. **Readability**
- Logical grouping of related functions
- Clear naming conventions
- Comprehensive documentation

### 4. **Scalability**
- Easy to add new features
- Simple to extend existing functionality
- Clear extension points

### 5. **Debugging**
- Errors are isolated to specific modules
- Stack traces point to specific files
- Easy to trace data flow

## Import/Export Pattern

This codebase uses ES6 modules with explicit imports and exports:

```javascript
// Export from module
export function myFunction() { ... }

// Import in another module
import { myFunction } from './path/to/module.js';
```

## Adding New Features

### Adding a New API Integration

1. Create a new file in `src/api/` (e.g., `newapi-api.js`)
2. Implement required functions:
   - `buildNewApiRequest()` - Build request configuration
   - `applyNewApiResultsToCsv()` - Apply results to CSV
   - `fetchNewApi()` - Main fetch function
3. Import and use in `event-handlers.js`
4. Add button listener in `initializeEventListeners()`

### Adding New Utility Functions

1. Add function to appropriate utility module (`csv-utils.js`, `dom-utils.js`, etc.)
2. Export the function
3. Import where needed

### Adding New State

1. Add state variable and accessor functions in `app-state.js`
2. Export getter/setter functions
3. Import and use in other modules

## Migration from Old Structure

The old `buttons.js` (954 lines) has been split into:
- `csv-utils.js` - 174 lines
- `dom-utils.js` - 37 lines
- `table-builder.js` - 114 lines
- `app-state.js` - 51 lines
- `apollo-api.js` - 233 lines
- `contactout-api.js` - 147 lines
- `zerobounce-api.js` - 182 lines
- `event-handlers.js` - 142 lines
- `main.js` - 28 lines

**Total: ~1,108 lines** (with better organization and documentation)

## Testing

Each module can be tested independently:

```javascript
// Example: Testing CSV utilities
import { parseRowColumns, findColumnIndex } from './utils/csv-utils.js';

// Test parseRowColumns
const row = "John,Doe,john@example.com";
const columns = parseRowColumns(row);
console.assert(columns.length === 3);

// Test findColumnIndex
const headers = ["name", "email", "organization"];
const emailIndex = findColumnIndex(headers, "email");
console.assert(emailIndex === 1);
```

## Future Improvements

1. **TypeScript Migration** - Add type safety
2. **Unit Tests** - Add test suite for each module
3. **Build Process** - Add bundling/minification
4. **Error Boundaries** - Add centralized error handling
5. **Logging** - Add structured logging module
6. **Configuration** - Move API configs to separate file
