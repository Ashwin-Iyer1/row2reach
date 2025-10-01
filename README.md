# Row 2 Reach

A powerful Electron desktop application for enriching CSV data with email addresses from Apollo and ContactOut APIs, and sending personalized bulk emails.

## Features

- **CSV File Processing**: Upload and visualize CSV files with contact information
- **Email Enrichment**: 
  - Fetch emails using Apollo API based on name, organization, and LinkedIn profiles
  - Fetch emails using ContactOut API based on LinkedIn profiles
- **Bulk Email Campaigns**: Send personalized emails to enriched contact lists
- **Variable Templates**: Use CSV column data as variables in email templates
- **Data Export**: Download enriched CSV files with new email columns
- **Modern UI**: Clean, responsive interface with dark/light mode support

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- API keys for:
  - [Apollo.io](https://apollo.io) (for email enrichment)
  - [ContactOut](https://contactout.com) (for LinkedIn-based email enrichment)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Ashwin-Iyer1/row2reach.git
cd row2reach
```

2. Install dependencies:
```bash
npm install
```

3. Set up your API configuration:
```bash
cp data/config.json.example data/config.json
```

4. Edit `data/config.json` with your API keys:
```json
{
  "APOLLO_KEY": "your_apollo_api_key_here",
  "CONTACTOUT_KEY": "your_contactout_api_key_here"
}
```

## Usage

### Starting the Application

```bash
npm start
```

### CSV Format Requirements

Your CSV file should contain the following columns for optimal results:

- **Name**: Full name of the contact
- **Organization**: Company name
- **LinkedIn**: LinkedIn profile URL
- Any additional columns you want to use as email template variables

Example CSV format:
```csv
Name,Organization,LinkedIn,Title
John Doe,Acme Corp,https://linkedin.com/in/johndoe,Software Engineer
Jane Smith,Tech Inc,https://linkedin.com/in/janesmith,Product Manager
```

### Workflow

1. **Upload CSV**: Click the file input area to select your CSV file
2. **Enrich Data**: 
   - Click "Fetch Apollo" to get emails based on name and organization
   - Click "Fetch Contact Out" to get emails from LinkedIn profiles
   - Click "Fetch All" to run both services
3. **Review Results**: View the enriched data in the table
4. **Send Emails**: Click "Email Users" to access the email composer
5. **Compose Campaign**: 
   - Write your subject and message using variables like `{Name}`, `{Organization}`
   - Preview emails to see how variables will be replaced
   - Send personalized emails to your contacts

### Email Templates

Use CSV column headers as variables in your email templates:

```
Subject: Hi {Name}, opportunity at {Organization}

Hi {Name},

I hope this email finds you well. I noticed your work at {Organization} and wanted to reach out about an exciting opportunity...

Best regards,
Your Name
```

### Building for Distribution

#### macOS (ARM64):
```bash
npm run buildMac
```

#### Windows:
```bash
npm run buildWin
```

Built applications will be available in the `release-builds` directory.

## Project Structure

```
electron-app/
├── app.js              # Main Electron process
├── preload.js          # Preload script for secure API exposure
├── index.html          # Main application page
├── emails.html         # Email composer page
├── styles.css          # Application styles
├── file-input.js       # CSV file handling
├── buttons.js          # API integration and data enrichment
├── emails-buttons.js   # Email functionality
├── data/
│   ├── config.json     # API configuration (gitignored)
│   └── config.json.example
└── package.json
```

## API Integration

### Apollo API
- Endpoint: `https://api.apollo.io/api/v1/people/bulk_match`
- Matches contacts based on name, organization, and LinkedIn URL
- Adds "Apollo Email" column to your CSV

### ContactOut API
- Endpoint: `https://api.contactout.com/v1/people/linkedin/batch`
- Finds emails based on LinkedIn profile URLs
- Adds "ContactOut Email" column to your CSV

## Security

- API keys are stored locally using `electron-json-storage`
- Keys are never exposed to the renderer process directly
- All API calls are made through secure context bridge

## Development

### File Structure
- `app.js`: Main Electron application setup
- `preload.js`: Secure bridge between main and renderer processes
- `buttons.js`: Handles API calls and data enrichment
- `emails-buttons.js`: Manages email composition and sending
- `file-input.js`: CSV file processing and table rendering

### Adding New Features
1. Add UI elements in HTML files
2. Implement functionality in respective JS files
3. Use `electronAPI` for secure communication with main process

## Troubleshooting

### Common Issues

**"Load a CSV first" error**: Ensure you've uploaded a valid CSV file before trying to enrich data.

**API errors**: Check that your API keys are correctly configured in `data/config.json`.

**No emails found**: Verify your CSV contains the required columns (Name, Organization, LinkedIn).

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