# The Blooming Bilingual — React App

Full React conversion of the tutoring platform SPA.

## Quick Start

```bash
# Install
npm install

# Dev server
npm run dev

# Build for production

```

## Demo Accounts

| Role    | Email                   | Password   |
|---------|-------------------------|------------|
| Student | sofia@demo.com          | pass123    |
| Tutor   | neelien@admin.com       | admin123   |

## Project Structure

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # Router + global layout
├── styles/
│   └── globals.css           # All CSS (design tokens + components)
├── context/
│   └── AppContext.jsx         # Auth, toast, modal state (React Context)
├── data/
│   └── constants.js          # Users, packs, static data, helpers
├── components/
│   ├── PublicNav.jsx          # Top nav + burger menu drawer
│   ├── ProtectedRoute.jsx     # Auth guard
│   ├── BuyCreditsModal.jsx    # Credit purchase modal
│   └── ui/
│       ├── Toast.jsx
│       └── Modal.jsx
│   └── dashboard/
│       ├── DashLayout.jsx     # Sidebar + dash-content wrapper
│       ├── Sidebar.jsx        # Sidebar with nav, credit widget, user footer
│       └── DashHeader.jsx     # Sticky header with burger button
└── pages/
    ├── Home.jsx               # Landing page
    ├── About.jsx              # About Neeliën
    ├── Services.jsx           # Services list
    ├── Pricing.jsx            # Credit packs + FAQ
    ├── Contact.jsx            # Contact form
    ├── Login.jsx              # Login with demo quick-fill
    ├── Register.jsx           # Registration
    └── Dashboard.jsx          # Dashboard shell + view router
        └── dashboard/
            ├── student/
            │   ├── StudentHome.jsx   # Student home with stats + upcoming
            │   └── BookingView.jsx   # Full booking calendar with hooks
            └── admin/
                └── AdminHome.jsx     # Admin home with schedule + uploads

```

## Expanding Dashboard Views

The remaining views (`StudentLessons`, `StudentResources`, `AdminStudents`, etc.)
render a `<Placeholder>` component. To build them out:

1. Create the file under `src/pages/dashboard/student/` or `admin/`
2. Import it in `src/pages/Dashboard.jsx`
3. Add it to the `switch` statement in `renderView()`

All state management goes through `AppContext` — access it with `useApp()`.

## Tech Stack

- **React 18** with hooks
- **React Router v6** for routing
- **Vite** for dev/build
- **Context API** for auth + UI state (no Redux needed at this scale)
- **CSS** — single globals.css with design tokens, no CSS modules or Tailwind needed
