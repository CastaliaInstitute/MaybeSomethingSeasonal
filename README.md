# Maybe Something Seasonal

A beautiful seasonal calendar celebrating nature's cycles and special moments throughout the year.

## Features

- 📅 **Interactive Calendar View** - Navigate through months and view events
- 🎨 **Custom Icons** - Each event has a unique emoji icon
- 📱 **Responsive Design** - Works perfectly on desktop and mobile
- 📥 **ICS Subscription** - Subscribe to the standard `MSS.ics` calendar feed
- 🔁 **Recurrence-aware feed** - Repeated Gregorian observances are normalized into RFC 5545 recurrence rules when the existing calendar data proves a stable yearly pattern
- 🌱 **Seasonal Focus** - Events centered around nature's cycles and seasonal celebrations

## Live Demo

Visit the live calendar at: [https://danielmcshan.github.io/MaybeSomethingSeasonal/](https://danielmcshan.github.io/MaybeSomethingSeasonal/)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CastaliaInstitute/MaybeSomethingSeasonal.git
cd MaybeSomethingSeasonal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

5. Open your browser and visit `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build copies `public/MSS.ics` into `dist/`, appends programmatic recurring events, normalizes repeated multi-year Gregorian instances into recurrence rules where the pattern is unambiguous, and validates the final subscription artifact.

## Project Structure

```
MaybeSomethingSeasonal/
├── src/
│   ├── App.tsx          # Main React component
│   ├── App.css          # Custom styles
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles
├── scripts/
│   ├── append-recurring-events.js
│   ├── normalize-recurring-events.js
│   ├── validate-recurring-events.js
│   └── generate-ics.js  # Legacy ICS generator
├── public/
│   └── MSS.ics          # Base calendar source file
├── .github/workflows/
│   ├── deploy.yml       # GitHub Pages deployment
│   └── pr.yml           # Pull-request validation
└── package.json
```

## Recurrence model

The published `dist/MSS.ics` is recurrence-aware:

- Repeated events that occur on the same Gregorian month/day in multiple years are collapsed into one event with `RRULE:FREQ=YEARLY`.
- Repeated events that consistently occur on the same ordinal weekday of a month are collapsed into a yearly `BYMONTH`/`BYDAY` rule.
- Repeated events whose dates move according to lunar, lunisolar, religious, astronomical, or other non-Gregorian rules remain explicit dated instances unless a dedicated generator supplies their future dates.
- Authoritative lunar, Jewish-calendar, and astronomical dates are pinned as `RDATE;VALUE=DATE` values during the build rather than receiving fake Gregorian RRULEs.
- For astronomical seasonal observances, the U.S. Naval Observatory season instant is mapped to the civil date in `America/Denver`; this timezone policy is recorded in the deployed VEVENT metadata.
- Stable UIDs are used for normalized and programmatically generated recurring events so subscription clients can refresh without duplicating them.

This deliberately avoids making a movable holiday recur on an incorrect Gregorian date merely because one year's date appeared in the source calendar.

## Customizing Events

`public/MSS.ics` is the base source of truth. Edit it directly to add, modify, or remove source events. Programmatic or inferred recurrences are applied during the production build.

The ICS file format includes:
- `SUMMARY:` - Event title
- `DTSTART:` - Event date/time
- `DTEND:` - End date/time
- `DESCRIPTION:` - Event description with embedded Icon and Category
- `RRULE:` / `RDATE:` - Recurrence information where appropriate

After editing, commit and push the changes. The app will automatically parse and display the updated events.

## Deployment

The project is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment workflow:

1. Builds the React application
2. Copies the base `public/MSS.ics` to `dist/`
3. Appends dedicated recurring events
4. Normalizes inferable repeated events
5. Validates the final `dist/MSS.ics`
6. Deploys `dist/` to GitHub Pages

## Technologies Used

- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **date-fns** - Date manipulation
- **Lucide React** - Icons
- **GitHub Pages** - Hosting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the beauty of seasonal changes and nature's cycles
- Built with modern web technologies for the best user experience
