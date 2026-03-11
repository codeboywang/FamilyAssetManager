# Family Finance Tracker

A comprehensive, privacy-first family finance tracking application. It helps you manage your family's assets, liabilities, insurance policies, and social favors (Renqing) all in one place.

## Features

*   **Dashboard**: A clear overview of your family's financial health, net worth trends, and asset allocation.
*   **Asset Management**: Track bank accounts, stocks, funds, real estate, vehicles, and loans. Supports multiple currencies and detailed repayment tracking (Equal Principal / Equal Installment).
*   **Family Members**: Manage assets by family members and define roles.
*   **Monthly Snapshot (Record Update)**: Easily update your asset values month by month to track your financial progress.
*   **Insurance Policies**: Keep track of all your family's insurance policies, premiums, renewal dates, and payment history.
*   **Benefits Tracker**: Manage various benefits (e.g., free car washes, airport lounges) and their usage history.
*   **Renqing (Favors)**: A unique feature to track social favors, gifts, and red envelopes given and received.
*   **Data Security**: Your data is yours. Export your data securely with password encryption, and import it back whenever needed.
*   **Multi-language Support**: Fully supports English and Chinese.

## Tech Stack

*   **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Recharts, Lucide Icons.
*   **Backend**: Node.js, Express.
*   **Database**: SQLite (local, file-based database for privacy and simplicity).

## Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/family-finance-tracker.git
    cd family-finance-tracker
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to `http://localhost:3000`.

### Initial Setup

1.  Upon first launch, you will be prompted to create an Admin account.
2.  Set up your family members in the **Members** tab.
3.  Add your financial accounts in the **Assets** tab.
4.  Use the **Update** tab to record your initial balances.

## Data Management

*   **Export**: Go to Settings -> Data Management -> Secure Export. Set a password to encrypt your backup file (`.zip` containing encrypted data).
*   **Import**: Go to Settings -> Data Management -> Decrypt Backup. Upload your `.zip` backup file and enter the password to restore your data.
*   **Mock Data**: For testing purposes, you can generate mock data from the Settings page.

## License

This project is licensed under the MIT License.
