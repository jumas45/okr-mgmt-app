# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
npm run dev         # Start development server (localhost:5173)
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint

# Testing
npm run test        # Run tests with Vitest
npm run test:ui     # Run tests with Vitest UI
```

## Architecture Overview

This is a React + TypeScript OKR (Objectives and Key Results) management application built with:

- **Frontend**: React 18 with TypeScript, Vite for bundling
- **Styling**: Tailwind CSS with dark mode support
- **Storage**: Dual storage system - localStorage (isolated) and SQLite via sql.js (indexed)
- **Testing**: Vitest with React Testing Library
- **State Management**: React Context + custom hooks

### Key Architecture Patterns

**Data Layer**:
- `src/hooks/OKRDataContext.tsx` - Main data provider with workspace management
- `src/hooks/useDataStore.ts` - Storage abstraction layer
- `src/hooks/useSQLiteStorage.ts` - SQLite implementation
- `src/types/index.ts` - TypeScript definitions for OKR entities

**Component Structure**:
- Single-page application with view-based routing via state
- Main views: Dashboard, Analytics, Archive, Settings, Hierarchy, Gantt Chart, OKR List
- Modular components in `src/components/`
- Comprehensive test coverage in `src/test/`

**Data Models**:
- Hierarchical OKRs: Objectives can have parent-child relationships
- Three levels: Company, Team, Individual
- Progress rollup: Child objective progress automatically affects parent progress
- Workspace isolation: Multiple workspaces with independent data

**Storage Migration**:
- Built-in data migration between localStorage and SQLite
- Status validation and migration for legacy data
- Workspace ID migration from legacy tenantId field

### Development Notes

- The app supports both light and dark themes
- All components use Tailwind CSS classes
- Tests are located alongside components in `src/test/`
- Progress calculations automatically roll up from key results to objectives to parent objectives
- Archive functionality preserves data while hiding from active views