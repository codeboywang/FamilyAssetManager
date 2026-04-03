# Family Finance Manager

A comprehensive, secure, and privacy-focused family financial management application.

## Features

- **Dashboard**: Overview of family net worth, assets, and liabilities. Trend charts and asset allocation pie charts.
- **Assets & Liabilities**: Manage various types of accounts (cash, bank, investment, loans, etc.) grouped by family members.
- **Monthly Records**: Track income, expenses, and loan repayments on a monthly basis. Includes detailed itemized tracking.
- **Events & Renqing**: Record special family events and "Renqing" (social obligations/gifts) to keep track of social capital.
- **Insurance**: Manage family insurance policies, track premium payments, and monitor renewal dates.
- **Benefits**: Track various benefits, coupons, or periodic perks (e.g., yearly checkups, monthly movie tickets).
- **Data Security**: All data is stored locally. No online tools or third-party tracking are integrated.
- **Data Management**: Export and import your data easily for backup or migration purposes.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Recharts, Lucide React, i18next
- **Backend**: Node.js, Express, SQLite3
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd family-finance-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

### Docker & NAS Deployment

This application can be easily deployed to a NAS (Synology, QNAP, Ugreen, etc.) using Docker.

#### Using Docker Compose (Recommended)

1. Upload the project files to your NAS (e.g., `/docker/family-assets`).
2. Navigate to the directory in your terminal and run:
   ```bash
   docker-compose up -d --build
   ```
3. Access the app at `http://<NAS-IP>:3000`.

#### Manual Docker Build

If you prefer to build the image manually:
```bash
docker build -t family-assets-app .
docker run -d \
  --name family-assets \
  -p 3000:3000 \
  -v /path/to/your/data:/app/data \
  -v /path/to/your/uploads:/app/uploads \
  -e NODE_ENV=production \
  family-assets-app
```

#### Troubleshooting Docker Build Errors

If you encounter an error like `npm error gyp ERR! stack Error: Could not find any Python installation to use` during the build process, it's because the `better-sqlite3` module needs to be compiled from source. The `Dockerfile` has been updated to include the necessary build tools (`python3`, `build-base`). Simply rebuild the image:

```bash
docker-compose up -d --build
```

**Note for NAS Users:** Ensure the `data` and `uploads` directories on your NAS have the correct read/write permissions for the Docker container.

## Data Privacy & Security

This application is designed with a strong focus on data privacy. 
- **Local Storage**: All financial data is stored in a local SQLite database (`data/family_assets.db`).
- **No Telemetry**: There are no analytics, tracking, or telemetry scripts included.
- **Offline Capable**: The app can function entirely offline once loaded.

## Localization

The application supports multiple languages (currently English and Chinese). You can switch languages from the Settings page.

## License

MIT License
