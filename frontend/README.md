# Frontend

This directory contains the React frontend application for the meeting summarizer.

## Directory Structure

- **public/**: Static assets
- **src/**: Source code
  - **components/**: React components
    - **layout/**: Layout components (header, footer)
    - **ui/**: Reusable UI components
  - **pages/**: Page components
  - **services/**: API and service functions
  - **graphql/**: GraphQL queries and mutations

## Development

To start the development server:

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

## Building for Production

To build the application for production:

```
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Configuration

The application uses AWS Amplify for authentication and API access. The configuration is stored in `src/aws-exports.js`.

After deploying the backend, update the configuration with the appropriate values from the Terraform outputs.
