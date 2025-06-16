#!/bin/bash

# Docker Compose Management Script
# This script provides a simplified interface for managing Docker Compose operations
# for the NIPS project. It handles building, starting, stopping, and monitoring containers.

# Exit on any error
set -e

# Function to display usage information
show_help() {
    echo "NIPS Docker Compose Management Script"
    echo "Usage: ./start.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build   - Build containers with no cache"
    echo "  clean   - Remove all containers and volumes, then rebuild"
    echo "  dev     - Start development mode"
    echo "  fresh   - Clean build and start containers"
    echo "  help    - Show this help message"
    echo "  logs    - Show container logs in follow mode"
    echo "  restart - Stop and start containers"
    echo "  soft    - Quick rebuild and restart"
    echo "  start   - Stop existing containers and start fresh"
    echo "  stop    - Stop all running containers"
    echo ""
}

# Function to check if docker compose is available
check_docker_compose() {
    if ! command -v docker compose &> /dev/null; then
        echo "Error: docker compose is not installed or not in PATH"
        exit 1
    fi
}

# Function to execute docker compose command with error handling
run_docker_compose() {
    if ! docker compose "$@"; then
        echo "Error: Docker compose command failed"
        exit 1
    fi
}

# Main script logic
main() {
    local arg=$1

    # Show help if no argument provided
    if [ -z "$arg" ]; then
        show_help
        exit 1
    fi

    # Check docker compose availability
    check_docker_compose

    case "$arg" in
        "build")
            echo "Building containers..."
            run_docker_compose build --no-cache
            ;;
        "clean")
            echo "Cleaning all containers and volumes..."
            run_docker_compose down -v
            run_docker_compose build --no-cache
            ;;
        "dev")
            echo "Starting development mode..."
            run_docker_compose down -v
            run_docker_compose build --no-cache
            run_docker_compose up -d
            ;;
        "fresh")
            echo "Performing fresh build and start..."
            run_docker_compose down
            run_docker_compose build --no-cache
            run_docker_compose up -d
            ;;
        "help")
            show_help
            ;;
        "logs")
            echo "Showing container logs..."
            run_docker_compose logs -f
            ;;
        "restart")
            echo "Restarting containers..."
            run_docker_compose down
            run_docker_compose up -d
            ;;
        "soft")
            echo "Performing soft rebuild..."
            run_docker_compose up -d --build
            ;;
        "start")
            echo "Starting containers..."
            run_docker_compose down
            run_docker_compose up -d
            ;;
        "stop")
            echo "Stopping containers..."
            run_docker_compose down
            ;;
        *)
            echo "Error: Unknown command '$arg'"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"