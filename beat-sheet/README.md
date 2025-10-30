# ALLY Beat Sheets Worker

Enterprise-grade UI worker for displaying ALLY screenplay beats with comprehensive story navigation.

## Overview

This worker provides a comprehensive UI for beat sheet management, forming part of the hierarchical story navigation system for stakeholders and collaborators.

## Story Navigation Hierarchy

**Acts** → **Sequences** → **Beats** → **Scenes**

- **Acts** (`acts.mobicycle.productions`) - High-level 3-act story structure
- **Sequences** (`sequences.mobicycle.productions`) - Story chunks within each act
- **Beats** (`beat-sheets.mobicycle-productions.workers.dev`) - Individual story moments (1 scene = 1 beat) ← **You are here**
- **Scenes** (`scenes.mobicycle.productions`) - Granular scene-by-scene breakdown

## Features

- **Beat Management**: Track individual story beats with detailed metadata
- **Scene Mapping**: 1 scene = 1 beat relationship
- **Act Organization**: Organize beats by act structure (1, 2A, 2B, 3)
- **Rich Metadata**: Track conflict, emotion, location, time, characters for each beat
- **Authentication**: Cloudflare Access JWT integration
- **Export Options**: HTML, JSON, CSV, PDF report generation
- **Responsive Design**: Dark/light theme toggle, mobile-friendly
- **Database Integration**: D1 database for fast queries and display

## Routes

### UI Routes
- `/` - MobiCycle Productions homepage
- `/ally` - Acts overview with beat access
- `/ally/act/{actNo}` - Act-specific beats display
- `/ally/act/{actNo}/beat/{beatNo}` - Individual beat detail page
- `/ally/beats/all` - All beats across entire script

### API Routes
- `/api` - API documentation
- `/health` - Health check
- `/api/reports/beats` - JSON beat report
- `/api/reports/beats/html` - HTML beat report
- `/api/reports/beats/csv` - CSV export
- `/api/reports/beats/pdf` - PDF export

## Database Schema

The worker expects a D1 database with a `beats` table. See `schema.sql` for the complete database structure.

## Deployment

```bash
npm install
npm run deploy
```

---

**MobiCycle Productions** - Premium Content Development & Production Services