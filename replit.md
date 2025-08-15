# Overview

This is a full-stack web application built with React and Express called "BWM XMD No Copyright Sounds" that serves as a music streaming platform. The application provides users with random music tracks from a curated collection of over 1500 NCS songs, featuring an audio player interface with streaming and download capabilities. The frontend is built with modern React using TypeScript and Vite, while the backend is a RESTful Express.js API that serves song data. The app includes interactive endpoint documentation, clipboard functionality, and is optimized for serverless deployment on Render or Vercel.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **UI Components**: shadcn/ui component library built on top of Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation resolvers

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API with JSON responses
- **Data Storage**: In-memory storage using a class-based implementation
- **Error Handling**: Centralized error handling middleware
- **Logging**: Custom request/response logging with timing information

## Database and ORM
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Database**: PostgreSQL (via Neon serverless)
- **Migrations**: Drizzle Kit for schema management
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Development Environment
- **Build System**: Vite for frontend development with hot module replacement
- **Development Server**: Custom Express server with Vite middleware integration
- **TypeScript**: Strict configuration with path mapping for clean imports
- **Code Quality**: ESM modules throughout the application

## Key Architectural Decisions

### Monorepo Structure
The application uses a monorepo structure with clear separation of concerns:
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Common TypeScript interfaces and schemas
- Root-level configuration files for tooling

### Component Architecture
The frontend uses a component-based architecture with:
- Reusable UI components from shadcn/ui
- Custom components for specific features (MusicPlayer, AnimatedBackground)
- Hook-based state management for UI logic
- TypeScript interfaces for type safety

### API Design
The backend follows REST principles with:
- GET `/random` - Returns a random song with streaming/download URLs from 1500+ NCS tracks
- GET `/health` - Health check endpoint
- CORS headers for cross-domain compatibility
- Structured error responses with appropriate HTTP status codes
- Request logging with performance metrics
- Interactive endpoint documentation with clipboard functionality

### Data Flow
- Frontend makes API requests using TanStack Query
- Server responds with JSON data from in-memory storage
- Audio streaming handled through direct URL references
- Download functionality implemented via programmatic link creation

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless** - Neon PostgreSQL serverless database connection
- **drizzle-orm** and **drizzle-kit** - Database ORM and migration tools
- **@tanstack/react-query** - Server state management and caching
- **wouter** - Lightweight React router

## UI and Styling
- **@radix-ui/** - Comprehensive set of unstyled, accessible UI primitives
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** - Utility for managing component variants
- **lucide-react** - Icon library for React components

## Form and Validation
- **react-hook-form** - Performant forms with minimal re-renders
- **@hookform/resolvers** - Validation resolvers for React Hook Form
- **zod** - TypeScript-first schema validation

## Development Tools
- **@replit/vite-plugin-runtime-error-modal** - Development error overlay
- **@replit/vite-plugin-cartographer** - Replit-specific development tooling
- **tsx** - TypeScript execution environment for Node.js
- **esbuild** - Fast JavaScript bundler for production builds

## Utilities
- **date-fns** - Modern JavaScript date utility library
- **clsx** and **tailwind-merge** - Utility for conditional CSS classes
- **nanoid** - Secure URL-friendly unique string ID generator