#!/bin/bash

# Database management commands for freediving.ph
# This script centralizes all database operations with the correct DATABASE_URL

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

# Function to start database manager container
start_db_manager() {
    print_status "Starting database manager container..."
    docker-compose --profile tools up -d db-manager
    sleep 2
    print_success "Database manager container started"
}

# Function to stop database manager container
stop_db_manager() {
    print_status "Stopping database manager container..."
    docker-compose --profile tools down db-manager
    print_success "Database manager container stopped"
}

# Function to run database push
db_push() {
    print_status "Pushing database schema..."
    start_db_manager
    docker-compose exec db-manager npm run db:push
    print_success "Database schema pushed successfully"
}

# Function to run database seed
db_seed() {
    print_status "Seeding database..."
    start_db_manager
    docker-compose exec db-manager npm run db:seed
    print_success "Database seeded successfully"
}

# Function to run both push and seed
db_setup() {
    print_status "Setting up database (push + seed)..."
    start_db_manager
    docker-compose exec db-manager npm run db:push
    docker-compose exec db-manager npm run db:seed
    print_success "Database setup completed"
}

# Function to reset database (drop and recreate)
db_reset() {
    print_warning "This will reset the database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Resetting database..."
        start_db_manager
        docker-compose exec db-manager npm run db:push
        docker-compose exec db-manager npm run db:seed
        print_success "Database reset completed"
    else
        print_status "Database reset cancelled"
    fi
}

# Function to show help
show_help() {
    echo "Database Management Commands for freediving.ph"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  push     - Push database schema"
    echo "  seed     - Seed database with data"
    echo "  setup    - Push schema and seed data"
    echo "  reset    - Reset database (push + seed)"
    echo "  start    - Start database manager container"
    echo "  stop     - Stop database manager container"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 push     # Push database schema"
    echo "  $0 seed     # Seed database"
    echo "  $0 setup    # Complete database setup"
    echo "  $0 reset    # Reset database"
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
    reset)
        db_reset
        ;;
    start)
        start_db_manager
        ;;
    stop)
        stop_db_manager
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
