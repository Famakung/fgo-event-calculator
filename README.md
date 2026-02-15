# FGO Event Shop Calculator

A web-based calculator for optimizing event item farming in Fate/Grand Order.

## Features

- **Shop Requirements Tracking**: Input how many bronze, silver, and gold event items you need and currently have
- **Bonus Configuration**: Set bonus drop amounts per material type
- **Drop Rate Calculator**: Configure base drops and primary/secondary multipliers
- **Quest Run Calculator**: Automatically calculates the optimal number of quest runs needed
- **Persistent Storage**: Saves your inputs to localStorage for convenience

## Usage

1. Open `index.html` in a web browser
2. Enter your shop requirements (items needed) and current holdings
3. Configure bonus drop amounts if you have bonus servants/CEs
4. Adjust drop rate multipliers as needed
5. Click "Calculate Quest Runs" to see recommended farming runs

## Drop Rate System

Each quest drops two types of materials:

| Quest | Primary Drop | Secondary Drop |
|-------|--------------|----------------|
| Bronze | Bronze | Silver |
| Silver | Silver | Gold |
| Gold | Gold | Bronze |

The calculator prioritizes farming the quest for your highest deficit material.

## File Structure

```
fgo-event-calculator/
├── index.html    # Main HTML structure
├── styles.css    # CSS with custom properties
└── app.js        # JavaScript with clean architecture
```

## Architecture

The application follows a clean architecture pattern with three layers:

| Layer | Modules | Purpose |
|-------|---------|---------|
| **Domain** | Schema, Validator, Calculator | Pure business logic, no DOM dependencies |
| **Application** | StateManager, Persistence, App | State management and coordination |
| **Presentation** | DOMFactory, UIBuilder, ViewManager, EventHandler | DOM manipulation and events |

## Technical Details

- Vanilla JavaScript with no external dependencies (except Google Fonts)
- Content Security Policy (CSP) for XSS protection
- Schema-based input validation with localStorage sanitization
- CSS custom properties for theming
- Data-driven architecture with configurable tier system

## Security

- CSP header restricts scripts and styles to same-origin
- All inputs validated against schema constraints
- localStorage data sanitized on load
- DOM elements created safely with `createElement()` (no innerHTML)
