# ERD Engine

## Overview

ERD Engine is a developer-focused web application for creating and editing Entity-Relationship Diagrams (ERDs). It features a custom Domain-Specific Language (DSL) parser that converts text-based ERD definitions into interactive visual diagrams using mxGraph (draw.io-like functionality). Users can write ERD definitions in a structured text format, parse them into an Abstract Syntax Tree (AST), and render them as draggable, resizable, and editable diagram elements on a canvas.

The application supports bidirectional editing - users can modify diagrams visually on the canvas or through the DSL text input, with changes synchronized between both representations. Export capabilities include DSL regeneration, JSON diagram model, SVG, and PNG formats.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **Diagram Rendering**: mxGraph library loaded via CDN for interactive canvas editing

### Core Application Modules
- **DSL Parser** (`client/src/lib/dsl-parser.ts`): Recursive descent parser that tokenizes and parses ERD DSL text into an AST
- **Diagram Model** (`client/src/lib/diagram-model.ts`): Transforms AST into renderable nodes and edges with position/styling data
- **mxGraph Editor** (`client/src/lib/mxgraph-editor.ts`): Initializes and manages the mxGraph canvas, handles shape rendering, interactions, and exports
- **Shape Palette** (`client/src/components/shape-palette.tsx`): UI component for selecting ERD elements (entities, attributes, relationships)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Server Structure**: HTTP server with modular route registration
- **API Design**: RESTful endpoints under `/api` prefix
- **Static Serving**: Production builds served from `dist/public`
- **Development**: Vite dev server integration with HMR support

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for shared type definitions
- **Storage Abstraction**: `IStorage` interface with in-memory implementation (MemStorage) for development
- **Type Sharing**: ERD types defined in `shared/erd-types.ts` for frontend/backend consistency

### Build System
- **Client Build**: Vite produces optimized bundles in `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.cjs`
- **Database Migrations**: Drizzle Kit with migrations output to `./migrations`

## External Dependencies

### Diagram Visualization
- **mxGraph**: Loaded from CDN (`cdn.jsdelivr.net/npm/mxgraph@4.2.2`) for draw.io-style diagram editing with drag-drop, resize, and connection capabilities

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database access with PostgreSQL driver
- **connect-pg-simple**: PostgreSQL session storage for Express

### UI Component Libraries
- **Radix UI**: Accessible primitive components (dialogs, dropdowns, tooltips, etc.)
- **shadcn/ui**: Pre-styled component collection built on Radix primitives
- **Lucide React**: Icon library for interface elements

### Fonts
- **Google Fonts**: Inter (UI), Fira Code (monospace for DSL input), DM Sans, Geist Mono

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, and dev banner for Replit environment integration