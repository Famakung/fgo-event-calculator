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

## Technical Details

- Single HTML file with embedded CSS and JavaScript
- No external dependencies (except Google Fonts)
- Uses CSS custom properties for theming
- Data-driven architecture with configurable tier system
