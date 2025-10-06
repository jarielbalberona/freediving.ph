#!/bin/bash

# Simple database management commands for freediving.ph
# This script handles database operations without Docker build issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run database push
db_push() {
    print_status "Pushing database schema..."
    cd api
    DATABASE_URL=postgres://fphbuddies:fphbuddiespw@localhost:5432/freedivingph npm run db:push
    print_success "Database schema pushed successfully"
}

# Function to run database seed
db_seed() {
    print_status "Seeding database..."
    cd api
    DATABASE_URL=postgres://fphbuddies:fphbuddiespw@localhost:5432/freedivingph npm run db:seed
    print_success "Database seeded successfully"
}

# Function to run both push and seed
db_setup() {
    print_status "Setting up database (push + seed)..."
    cd api
    DATABASE_URL=postgres://fphbuddies:fphbuddiespw@localhost:5432/freedivingph npm run db:push
    DATABASE_URL=postgres://fphbuddies:fphbuddiespw@localhost:5432/freedivingph npm run db:seed
    print_success "Database setup completed"
}

# Function to show help
show_help() {
    echo "Simple Database Management Commands for freediving.ph"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  push     - Push database schema"
    echo "  seed     - Seed database with data"
    echo "  setup    - Push schema and seed data"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 push     # Push database schema"
    echo "  $0 seed     # Seed database"
    echo "  $0 setup    # Complete database setup"
}

# Main script logic
case "${1:-help}" in
    push)
        db_push
        ;;
    seed)
        db_seed
        ;;
    setup)
        db_setup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
