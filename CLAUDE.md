# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tournament management application for organizing multi-stage championships with real-time spectator viewing. Supports qualification rounds, tournament brackets, and season-long standings tracking.

**Tech Stack:** React 19.1 + TypeScript 5.8 + Vite 6.2 + TailwindCSS (CDN)

## Development Commands

```bash
npm install                # Install dependencies
npm run dev               # Start development server (Vite)
npm run build             # Build for production
npm run preview           # Preview production build
```

**Note:** No test suite is currently configured.

## Architecture

### State Management

All application state lives in `App.tsx` as a single `AppState` object managed by `useState`. Updates are immutable and use spread operators. The application follows a phase-based state machine pattern:

```typescript
CHAMPIONSHIP_VIEW → QUALIFICATION → BRACKET → FINISHED
```

State is propagated down through props (no Context API or state management library).

### Real-Time Communication via ntfy.sh

The application uses ntfy.sh (open-source notification service) for pub/sub communication with **no backend server**. Three communication patterns:

1. **Admin → Spectators:** State broadcasts when admin updates results
2. **Participants → Admin:** Registration submissions via ntfy.sh
3. **Spectators ← Admin:** Live results via Server-Sent Events (SSE)

**CRITICAL:** State broadcasting uses 1-second debouncing to prevent ntfy.sh rate limiting (429 errors). This debouncing is essential and must be preserved when modifying state update logic. See `App.tsx:96-99`.

### URL-Based Routing (No Router Library)

- No query params → Admin interface (main `App` flow)
- `?session=<id>` → `RegistrationPage` (public participant registration)
- `?live=<id>` → `LiveResultsView` (read-only spectator view)

### Tournament Bracket Algorithm

Located in `App.tsx:147-210`. Key logic:
- Bracket size: next power of 2 from participant count
- Traditional seeding (1 vs N, 2 vs N-1, etc.)
- Automatic bye advancement for unmatched players
- Third-place match generated after semifinals
- Match linkage via `nextMatchId` for winner propagation

Points system awards qualification points (top 32) and main competition points (1st: 100, 2nd: 88, etc.).

### Key Files

- `App.tsx` (409 lines) - Core state management, phase transitions, bracket generation
- `types.ts` - All TypeScript interfaces and enums
- `constants.ts` - Application constants (MIN_PARTICIPANTS, AppPhase enum)
- `components/ChampionshipView.tsx` (353 lines) - Season standings and participant management
- `components/TournamentBracket.tsx` (262 lines) - Complex bracket rendering and match updates
- `components/LiveResultsView.tsx` (204 lines) - Read-only live view with SSE connection

### Important Implementation Details

1. **No Persistence:** All state is client-side. Page refresh loses data unless viewing via live link.

2. **Immediate Fetch Pattern:** `LiveResultsView` fetches last saved state from ntfy.sh on mount to show results immediately, then subscribes to SSE for updates. See `LiveResultsView.tsx:101-103`.

3. **Deep Cloning for Nested Updates:** Bracket updates use `JSON.parse(JSON.stringify(bracket))` to ensure immutability when modifying nested match structures.

4. **Session IDs:** Generated client-side as `dmec-${Date.now()}-${Math.random()}`. No server-side session management.

5. **Bilingual Code:** UI text is in Estonian. Some critical comments are in Estonian (especially around debouncing and rate limiting).

6. **Vite Configuration:** Uses path alias `@/*` mapping to project root. React loaded via importmap (not Vite plugin), Tailwind via CDN.

## Configuration Notes

- **TypeScript:** Target ES2022, JSX transform: react-jsx, strict mode enabled
- **Vite:** No React plugin (uses importmap), environment variables for `GEMINI_API_KEY` (legacy, not currently used)
- **HTML:** React + ReactDOM loaded from `aistudiocdn.com` importmap, Tailwind from CDN

## Common Patterns

- **Form submissions:** Enter key support throughout
- **State updates:** Always use prev state updater functions: `setState(prev => ({ ...prev, ... }))`
- **Conditional rendering:** Phase-based component switching in `App.tsx`
- **Sorting:** Championship standings sorted by total points (descending)
