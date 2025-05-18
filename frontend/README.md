# SharePay Frontend

A modern web application for managing shared expenses and payments between friends, roommates, or groups.

## Features

- Create and manage expense groups
- Split bills and track balances
- Real-time updates
- Responsive design for all devices
- Secure authentication

## Prerequisites

- Node.js (v16 or higher recommended)
- npm (v7 or higher) or yarn

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:
   ```
   VITE_API_BASE_URL=your_api_url_here
   # Add other environment variables as needed
   ```

4. **Running the Application**
   - Development mode:
     ```bash
     npm run dev
     # or
     yarn dev
     ```
     The app will be available at `http://localhost:5173`

   - Production build:
     ```bash
     npm run build
     npm run preview
     ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- React 19
- Vite
- Material-UI (MUI)
- React Router
- Emotion

## Project Structure

```
src/
  ├── assets/         # Static assets
  ├── components/     # Reusable UI components
  ├── pages/          # Page components
  ├── hooks/          # Custom React hooks
  ├── utils/          # Utility functions
  ├── services/       # API services
  ├── store/          # State management
  └── App.jsx         # Main App component
```

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests and linter
4. Submit a pull request

## License

[Your License Here]
