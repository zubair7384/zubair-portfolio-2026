# zubairiqbal.com

Portfolio site for Zubair Iqbal, full-stack engineer and team lead.

Static site, no build step. Three.js, GSAP, Lenis and cannon-es are self-hosted in `vendor/`; fonts (Geist, Geist Mono) in `assets/fonts/`.

## Run locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173.

## Structure

- `index.html` — the page
- `css/site.css` — design system and styles
- `js/main.js` — scroll motion, reveals, form, scene loading
- `js/objects.js` — physics object piles (hero and footer)
- `js/bust.js` — the marble bust
- `assets/` — models, fonts, icons, share card
- `netlify.toml` — headers for Netlify

## Credits

Scanned objects from [Poly Haven](https://polyhaven.com) (CC0). Logos from [Simple Icons](https://simpleicons.org) (CC0). Geist by Vercel (OFL).
