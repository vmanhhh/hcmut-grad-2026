# HCMUT Graduation Invitation Constitution

## Core Principles

### I. Card First, Always Reachable

The invitation card (name, message, date, meeting point, RSVP, calendar, directions) is the product; the journey is decoration. The card MUST be reachable in one tap from any point of the journey and visible within 3 seconds on a typical 4G phone, even if game assets have not loaded. No game feature may delay or block the card.

### II. Guest Privacy by Design

Guest data (name, message, RSVP, wish) MUST NOT appear in URLs, static bundles, build output, link previews, or logs. It is fetched only from the server after a valid invite code is presented. The database is accessed only from server code with server-held credentials; no guest table is readable from the browser. Invalid codes reveal nothing.

### III. Mobile First

Every screen is designed and verified on a phone (iOS Safari, Android Chrome, and the Zalo / Messenger in-app browsers) before desktop. Touch targets are at least 44px, layouts work in portrait, and heavy effects degrade gracefully under reduced motion or low power.

### IV. Critical-Flow Tests Only

Automated end-to-end tests cover only the critical flows: valid vs invalid link, first vs return visit, RSVP save/change, calendar file content, and skip-to-card. Everything else is verified manually against `quickstart.md`. TDD is not required.

### V. Simple and Shippable

Prefer the smallest thing that delivers the spec before the event date (2026-11-28). Static content over CMS, a database dashboard over a custom admin, one app over many services. Any extra layer must be justified in the plan's Complexity Tracking.

## Constraints

- Hosting: free tier only (no custom domain).
- Content language: Vietnamese.
- Event facts and gate guidance must be editable without redeploying the game.

## Governance

This constitution overrides other practices for this project. Amendments are made by the host and recorded here with a version bump. Every plan must pass the Constitution Check before implementation.

**Version**: 1.0.0 | **Ratified**: 2026-11-05 | **Last Amended**: 2026-11-05
