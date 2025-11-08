# Module Dependency Graph

This document visualizes the dependencies between modules in the refactored codebase.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         index.html                           │
│                    (HTML Entry Point)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─── file-input.js (File Upload Handler)
                     │
                     └─── src/main.js (Main Entry Point)
                           │
                           ├─────────────────────────────────┐
                           │                                 │
                           ▼                                 ▼
                    ┌──────────────┐              ┌──────────────────┐
                    │ State Module │              │ Handlers Module  │
                    └──────┬───────┘              └────────┬─────────┘
                           │                               │
                           │                               │
        ┌──────────────────┼───────────────────────────────┼──────────┐
        │                  │                               │          │
        ▼                  ▼                               ▼          ▼
   ┌─────────┐      ┌──────────┐                   ┌─────────┐  ┌─────────┐
   │   API   │      │ Utilities│                   │   API   │  │   API   │
   │ Apollo  │      │   CSV    │                   │ZeroBounc│  │ContactOu│
   └────┬────┘      │   DOM    │                   └────┬────┘  └────┬────┘
        │           │  Table   │                        │            │
        │           └────┬─────┘                        │            │
        │                │                              │            │
        └────────────────┴──────────────────────────────┴────────────┘
                         │
                         ▼
                  Browser/Electron APIs
```

## Module Dependencies

### src/main.js
**Purpose:** Application entry point and initialization

**Imports:**
- `state/app-state.js` - State management
- `utils/table-builder.js` - Table rendering
- `utils/csv-utils.js` - CSV normalization
- `handlers/event-handlers.js` - Event handlers

**Exports:** None (attaches to window object)

**Dependencies:** None

---

### src/state/app-state.js
**Purpose:** Global state management

**Imports:** None

**Exports:**
- `csvRows` - Original CSV data
- `enrichedCsvData` - Enriched CSV data
- `getCsvRows()` - Get CSV rows
- `setCsvRows()` - Set CSV rows
- `getEnrichedCsvData()` - Get enriched data
- `setEnrichedCsvData()` - Set enriched data
- `initializeStateListeners()` - Initialize listeners

**Dependencies:** Browser (window object)

---

### src/utils/csv-utils.js
**Purpose:** CSV parsing and manipulation

**Imports:** None

**Exports:**
- `normalizeCsvRows()` - Normalize CSV input
- `rowsToCsvString()` - Convert to CSV string
- `parseRowColumns()` - Parse row columns
- `parseHeaders()` - Parse headers
- `findColumnIndex()` - Find column index
- `ensureHeader()` - Ensure header exists
- `setEmailInRow()` - Set email in row
- `extractEmailsFromCsv()` - Extract emails

**Dependencies:** None

---

### src/utils/dom-utils.js
**Purpose:** DOM manipulation helpers

**Imports:** None

**Exports:**
- `replaceText()` - Replace element text
- `getElementSafely()` - Safe element retrieval
- `toggleButtonVisibility()` - Toggle button visibility

**Dependencies:** Browser (document object)

---

### src/utils/table-builder.js
**Purpose:** HTML table construction

**Imports:**
- `utils/csv-utils.js` - CSV parsing
- `utils/dom-utils.js` - DOM utilities

**Exports:**
- `createTableHeader()` - Create table header
- `createTableRow()` - Create table row
- `createTableBody()` - Create table body
- `buildTableFromRows()` - Build complete table
- `renderTable()` - Render table to DOM
- `dispatchCsvRowsUpdated()` - Dispatch update event
- `displayCsvAsTable()` - Display CSV as table

**Dependencies:**
- Browser (document, window)
- csv-utils.js
- dom-utils.js

---

### src/api/apollo-api.js
**Purpose:** Apollo.io API integration

**Imports:**
- `utils/csv-utils.js` - CSV utilities
- `utils/dom-utils.js` - DOM utilities
- `utils/table-builder.js` - Table rendering
- `state/app-state.js` - State management

**Exports:**
- `getApolloDetailsFromCsvRows()` - Extract details
- `buildApolloRequest()` - Build request
- `applyApolloMatchesToCsv()` - Apply results
- `applyApolloMatchesToCsvChunk()` - Apply chunk results
- `extractEmailsFromMatches()` - Extract emails
- `fetchApollo()` - Main fetch function

**Dependencies:**
- Browser (fetch, window.electronAPI)
- All utility modules
- State module

---

### src/api/zerobounce-api.js
**Purpose:** ZeroBounce API integration

**Imports:**
- `utils/csv-utils.js` - CSV utilities
- `utils/dom-utils.js` - DOM utilities
- `utils/table-builder.js` - Table rendering
- `state/app-state.js` - State management

**Exports:**
- `buildZeroBounceFormData()` - Build form data
- `applyZeroBounceResultsToCsv()` - Apply results
- `fetchZeroBounce()` - Main fetch function

**Dependencies:**
- Browser (fetch, FormData, Blob, window.electronAPI)
- All utility modules
- State module

---

### src/api/contactout-api.js
**Purpose:** ContactOut API integration

**Imports:**
- `utils/csv-utils.js` - CSV utilities
- `utils/dom-utils.js` - DOM utilities
- `utils/table-builder.js` - Table rendering
- `state/app-state.js` - State management

**Exports:**
- `extractLinkedinProfiles()` - Extract profiles
- `buildContactOutRequest()` - Build request
- `applyContactOutResultsToCsv()` - Apply results
- `fetchContactOut()` - Main fetch function

**Dependencies:**
- Browser (fetch, window.electronAPI)
- All utility modules
- State module

---

### src/handlers/event-handlers.js
**Purpose:** Event handling and user interactions

**Imports:**
- `utils/csv-utils.js` - CSV utilities
- `state/app-state.js` - State management
- `api/apollo-api.js` - Apollo fetch
- `api/zerobounce-api.js` - ZeroBounce fetch
- `api/contactout-api.js` - ContactOut fetch

**Exports:**
- `validateCsvLoaded()` - Validate CSV exists
- `downloadCsvFile()` - Download CSV file
- `navigateToEmailPage()` - Navigate to email page
- `initializeEventListeners()` - Initialize listeners
- `initializePageLoadHandler()` - Initialize page load

**Dependencies:**
- Browser (document, localStorage, window.electronAPI, Blob, URL)
- CSV utilities
- State module
- All API modules

---

## Data Flow

### CSV Upload Flow
```
User uploads CSV
      │
      ▼
file-input.js reads file
      │
      ▼
Calls window.displayCsvAsTable()
      │
      ▼
main.js → table-builder.js
      │
      ▼
Dispatches 'csv:rows-updated' event
      │
      ▼
app-state.js updates state
      │
      ▼
Table rendered to DOM
```

### API Fetch Flow
```
User clicks API button
      │
      ▼
event-handlers.js validates CSV
      │
      ▼
Calls appropriate API module
      │
      ▼
API module:
  1. Gets data from app-state
  2. Calls external API
  3. Processes response
  4. Updates enriched data
  5. Renders updated table
      │
      ▼
User sees enriched data
```

### Download Flow
```
User clicks Download button
      │
      ▼
event-handlers.js → downloadCsvFile()
      │
      ▼
Gets enriched data from app-state
      │
      ▼
Converts to CSV string (csv-utils)
      │
      ▼
Creates Blob and download link
      │
      ▼
File downloaded to user's computer
```

## Circular Dependency Prevention

The architecture prevents circular dependencies through:

1. **Layered Architecture:**
   - Utilities (bottom layer) - no dependencies on other modules
   - State (middle layer) - no dependencies on utilities or API
   - API (middle layer) - depends on utilities and state
   - Handlers (top layer) - depends on everything
   - Main (entry point) - orchestrates initialization

2. **Dependency Direction:**
   - Dependencies always flow downward/inward
   - No module imports from a higher layer
   - State module is independent

3. **Interface Segregation:**
   - Each module exports only what's needed
   - Functions are small and focused
   - State access is through getters/setters

## Testing Strategy

### Unit Testing Order
1. **csv-utils.js** - Pure functions, no dependencies
2. **dom-utils.js** - Simple DOM operations
3. **app-state.js** - State management
4. **table-builder.js** - Uses csv-utils, dom-utils
5. **API modules** - Mock fetch, state, utilities
6. **event-handlers.js** - Mock all dependencies
7. **main.js** - Integration testing

### Mock Requirements
- **Browser APIs:** document, window, fetch, localStorage
- **Electron API:** window.electronAPI
- **Module dependencies:** Use dependency injection where possible
