#!/bin/bash

app_env=${1:-development}

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Development environment commands
dev_commands() {
    echo "Running React development environment..."

    # Set backend API URL so the app calls the backend directly.
    # Defaults to the production backend; override via Sealos env var if needed.
    export REACT_APP_API_BASE="${REACT_APP_API_BASE:-https://cjdfnwwofgct.sealosgzg.site}"
    echo "Using REACT_APP_API_BASE=$REACT_APP_API_BASE"

    npm run start
}

# Production environment commands
prod_commands() {
    echo "Running React production environment..."
    # Install serve if needed for production
    if ! command -v serve &> /dev/null; then
        echo "Installing serve package..."
        npm install -g serve
    fi

    # Set backend API URL for production build.
    # Defaults to the production backend; override via Sealos env var if needed.
    export REACT_APP_API_BASE="${REACT_APP_API_BASE:-https://cjdfnwwofgct.sealosgzg.site}"
    echo "Building with REACT_APP_API_BASE=$REACT_APP_API_BASE"

    npm run build
    echo "Starting production server..."
    npx serve -s build
}

# Check environment variables to determine the running environment
if [ "$app_env" = "production" ] || [ "$app_env" = "prod" ] ; then
    echo "Production environment detected"
    prod_commands
else
    echo "Development environment detected"
    dev_commands
fi
