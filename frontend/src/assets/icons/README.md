# Icons

## Hand-drawn icons (`hand_drawn/`)

SVGs drawn in Inkscape by Japhy. After saving from Inkscape, run the fix script before they'll render correctly in the app.

### The problem

Inkscape saves paths with hardcoded `fill:#000000` and `stroke:#000000` in the `style` attribute. Inline styles override CSS, so the icons always appear black regardless of what the CSS says.

### The fix

Run this after saving any icon from Inkscape:

```bash
sed -i 's/fill:#000000/fill:currentColor/g; s/stroke:#000000/stroke:currentColor/g' path/to/icon.svg
```

To fix all hand-drawn icons at once:

```bash
for f in frontend/src/assets/icons/hand_drawn/*.svg; do
  sed -i 's/fill:#000000/fill:currentColor/g; s/stroke:#000000/stroke:currentColor/g' "$f"
done
```

`currentColor` makes the SVG inherit the CSS `color` property of its parent element, so the icons respond to active/inactive states in the bottom bar and post actions.

### Adjusting stroke width

```bash
sed -i 's/stroke-width:[0-9.]*/stroke-width:1.3/g' path/to/icon.svg
```

### Importing in React (Vite)

```jsx
import MyIcon from '../assets/icons/hand_drawn/my-icon.svg?react';
```

The `?react` suffix requires `vite-plugin-svgr` (already installed). It turns the SVG into a React component.

### Icon map

| File | Used for |
|------|----------|
| `home.svg` | Bottom bar – Home |
| `following.svg` | Bottom bar – Following |
| `create.svg` | Bottom bar – Create |
| `search.svg` | Bottom bar – Search |
| `profile.svg` | Bottom bar – Profile |
| `gear.svg` | Profile page settings button |
| `empty_heart.svg` | Post action – Like (unliked state) |
| `full_heart.svg` | Post action – Like (liked state) |
| `chat_bubble.svg` | Post action – Comments |
| `reply.svg` | Post action – Reply |
| `check_mark.svg` | Composer submit button |
| `cycle.svg` | Post action – Re-rate |
| `pencil.svg` | Post action – Edit |
| `camera.svg` | File input – Take photo |
| `upload.svg` | File input – Upload from library |
