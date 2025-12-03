# Row 2 Reach

A powerful Electron desktop application for enriching CSV data with email addresses from Apollo and ZeroBounce APIs, and sending personalized bulk emails.

## Features

- **CSV File Processing**: Upload and visualize CSV files with contact information
- **Email Enrichment**:
  - **Apollo**: Fetch emails using Apollo API based on name, organization, and LinkedIn profiles
  - **ZeroBounce**: Validate and enrich email data
- **Bulk Email Campaigns**: Send personalized emails to enriched contact lists via Microsoft Graph
- **Variable Templates**: Use CSV column data as variables in email templates
- **Data Export**: Download enriched CSV files with new email columns
- **Modern UI**: Clean, responsive interface with dark/light mode support

## Installation

### Windows

1. Download the latest installer (`Row2ReachSetup.exe`) from the [Releases](https://github.com/Ashwin-Iyer1/row2reach/releases) page.
2. Double-click the installer to run it.
3. The application will install and launch automatically. A shortcut will be created on your desktop.

### macOS (Apple Silicon)

1. Download the latest release zip (`Row_2_Reach-darwin-arm64.zip`) from the [Releases](https://github.com/Ashwin-Iyer1/row2reach/releases) page.
2. Unzip the file to extract `Row 2 Reach.app`.
3. Drag and drop `Row 2 Reach.app` into your **Applications** folder.
4. Double-click to launch.

## Configuration

On your first launch, the application will ask for your API keys. You can enter them manually or drag and drop a `config.json` file.

You will need:

1. **Apollo API Key**: Available from your [Apollo.io](https://apollo.io) account settings.
2. **ZeroBounce API Key**: Available from your [ZeroBounce](https://www.zerobounce.net) dashboard.

Once saved, these keys are stored securely on your local machine. You can edit them later via the application menu (`Row 2 Reach` > `Edit API Keys...`).

## Usage

### 1. Prepare Your Data

Your CSV file should contain the following columns for optimal results:

- **Name**: Full name of the contact
- **Organization**: Company name
- **LinkedIn**: LinkedIn profile URL
- Any additional columns you want to use as email template variables

**Example CSV:**

```csv
Name,Organization,LinkedIn,Title
John Doe,Acme Corp,https://linkedin.com/in/johndoe,Software Engineer
Jane Smith,Tech Inc,https://linkedin.com/in/janesmith,Product Manager
```

### 2. Workflow

1. **Upload CSV**: Drag and drop your CSV file into the application window or click to browse.
2. **Enrich Data**:
   - Click **Fetch Apollo** to find emails based on name and organization.
   - Click **Fetch Zero Bounce** to validate emails and find additional data.
   - Click **Fetch All** to run both services sequentially.
3. **Review Results**: The table will update with new columns like `Apollo Email` and `ZeroBounce Status`.
4. **Export**: Click **Download CSV** to save the enriched data.

### 3. Sending Emails

1. Click **Email Users** to open the email composer.
2. **Sign In**: Click **Sign in using Popup** to authenticate with your Microsoft (Outlook/Office 365) account.
3. **Compose**:

   - Write your subject and message.
   - Use variables from your CSV columns by wrapping headers in curly braces, e.g., `{Name}`, `{Organization}`.

   **Template Example:**

   ```text
   Hi {Name},

   I saw you are working at {Organization} as a {Title}.
   ```

4. **Preview & Send**:
   - Click **Preview** to see how the variables render for the first few contacts.
   - Click **Send All** to send the campaign.
   - Click **Draft All** to create drafts in your "Drafts" folder instead of sending immediately.

---

## Development & Build Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Ashwin-Iyer1/row2reach.git
   cd row2reach
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Mode

Run the application locally with hot-reload (if configured) or standard electron start:

```bash
npm start
```

_Note: In development, you can use a `data/config.json` file (copy from `data/config.json.example`) or use the in-app configuration page._

### Building for Distribution

#### macOS (ARM64)

```bash
npm run buildMac
```

The built application will be in `release-builds/Row_2_Reach-darwin-arm64/`.

#### Windows

```bash
# Step 1: Build the Windows app
npm run buildWin

# Step 2: Create the installer (requires Windows or Wine)
npm run create-installer
```

The portable Windows app will be in `release-builds/Row_2_Reach-win32-x64/`, and the installer files will be in `release-builds/installers/`.

### Publishing Releases (Auto-Updates)

This application supports automatic updates via GitHub Releases.

1. **Build** the app for the target platform.
2. **Sign & Notarize** (Critical for macOS).
3. **Create Release**:
   - Tag a new version (e.g., `v1.0.1`).
   - Upload the artifacts:
     - **macOS**: `.zip` of the `.app` bundle.
     - **Windows**: `Row2ReachSetup.exe`, `RELEASES`, and `.nupkg` files.
4. **Publish**: The app will detect the new version on next launch.

### Project Structure

```
electron-app/
├── app.js              # Main Electron process
├── preload.js          # Preload script for secure API exposure
├── index.html          # Main application page
├── config.html         # Configuration page
├── emails.html         # Email composer page
├── src/                # Source code
│   ├── api/            # API integration logic (Apollo, ZeroBounce)
│   ├── handlers/       # Event handlers
│   ├── state/          # State management
│   └── utils/          # Utility functions
├── data/               # Local data storage
└── package.json
```

### API Integration

- **Apollo API**: Matches contacts based on name, organization, and LinkedIn URL.
- **ZeroBounce API**: Validates email addresses and provides deliverability status.

### Security

- API keys are stored locally using `electron-json-storage`.
- Keys are never exposed to the renderer process directly.
- All API calls are made through a secure context bridge.
- Microsoft Graph authentication uses MSAL for secure token handling.

## Troubleshooting

### Common Issues

- **"Load a CSV first" error**: Ensure you've uploaded a valid CSV file before trying to enrich data.
- **API errors**: Check that your API keys are correctly configured in the settings.
- **No emails found**: Verify your CSV contains the required columns (Name, Organization, LinkedIn).

### Debug Mode

Run the application with developer tools:

```bash
npm start
# Then press Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (macOS)
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the ISC License - see the package.json file for details.

## Support

For support, please open an issue in the GitHub repository.
