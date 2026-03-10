# AidSync — Style Guide

## Design Intent

AidSync should look like a field-ready clinical tool:
- clear
- resilient
- low-noise
- legible outdoors
- calm under pressure

Not:
- glossy fintech
- neon cyberpunk
- generic SaaS admin sludge

---

## Visual Principles

### 1. Calm utility
Whitespace, clear grouping, low visual clutter.

### 2. Information hierarchy first
Warnings and patient context must be easy to scan.

### 3. Mobile-first reality
Large tap targets. Fast flows. Camera actions obvious.

### 4. Explainability
Every warning state must include visible reasoning.

---

## UI Personality

### Feels like
- a dependable clinical notebook
- a modern field operations tool
- something serious but not intimidating

### Does not feel like
- a hospital ERP
- a gaming UI
- a growth-hacker dashboard
- a war-room cosplay panel

---

## Color Direction

Use restrained colors.

### Base
- Off-white / soft neutral backgrounds
- Dark slate text
- Muted dividers
- Soft card surfaces

### Semantic safety colors
- Green: safe / no obvious issue
- Amber: caution / manual review
- Red: serious warning / contraindication
- Blue/Slate: informational / sync state

Do not use bright saturated marketing gradients.

---

## Typography

- highly legible sans-serif
- medium weight for headings
- regular weight for body
- slightly larger text than typical consumer apps
- numeric data should align cleanly in vitals and warning lists

Priority:
- readability in harsh light
- clarity under time pressure

---

## Iconography

Use simple, universal icons:
- patient
- clipboard / note
- camera / scan
- microphone / voice note
- warning triangle
- sync
- check
- attachment
- medication / pill

Avoid:
- decorative medical cliches
- overly rounded toy-like icons
- military symbolism

---

## Layout Rules

### Screen structure
- sticky top bar with patient / context
- primary action visible without scrolling when possible
- danger / warning zone visually separated
- sync state visible but not intrusive

### Card structure
Each card should answer one thing:
- patient identity
- current medications
- allergies
- scanned insert result
- safety warning
- encounter note

---

## Interaction Patterns

### Patient flow
- search or quick-select patient
- fast entry into encounter
- visible patient context before medication check

### Scan flow
- capture image
- preview OCR
- preview extracted fields
- run check
- review warnings
- save to history

### Voice flow
- tap to record
- show transcript preview
- allow quick edit
- save into encounter notes

### Sync flow
- subtle status chip
- clear pending count if offline
- no blocking unless critical

---

## Copy Style

### Use
- short labels
- explicit button text
- direct instructional text
- short warning summaries with expandable details

### Avoid
- marketing fluff
- verbose helper text
- unexplained abbreviations unless standard clinical ones

---

## Example Microcopy

### Good
- Scan insert
- Review extracted data
- Check medication safety
- Save to encounter
- Record voice note
- Pending sync
- Synced just now
- Manual review recommended
- Potential interaction found

### Bad
- Unleash AI insight
- Run intelligent auto-remediation
- Next-gen care operation
- Tactical prescribing mode

---

## Empty State Guidance

Empty states should be useful, not cute.

Examples:
- No patients synced yet
- No current medications recorded
- No scans for this encounter
- No voice notes for this encounter
- No safety warnings found

---

## Motion / Feedback

- minimal animation
- instant local confirmation
- progress indicators only where necessary
- use motion to reinforce state, not impress judges

---

## Accessibility

- high contrast text
- color not used as the only warning signal
- readable error messages
- touch targets large enough for field conditions
- support screen scaling gracefully

---

## Screenshot / Demo Readiness

For demo screenshots:
- use realistic but synthetic patient data
- keep one strong warning example
- show sync state clearly
- show one scan preview + one warning result + one patient timeline

---

## Design Summary

AidSync should look like a trustworthy field tool built for difficult conditions:
**calm, clear, serious, and fast.**
