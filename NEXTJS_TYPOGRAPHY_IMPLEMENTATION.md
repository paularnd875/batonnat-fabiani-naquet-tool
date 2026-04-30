# Configuration Typographique Complète pour Next.js - Site Fabiani-Naquet

## 🎨 Résumé de l'Identité Typographique

Le site Fabiani-Naquet utilise une combinaison distinctive de deux polices principales :

1. **Resolve** - Police display bold pour les titres et la navigation (custom font)
2. **Inter** - Police moderne pour le corps de texte
3. **Cormorant Garamond** - Police serif élégante (utilisée ponctuellement)

### Caractéristiques clés :
- **Titres en UPPERCASE** avec la police Resolve
- **Letter-spacing** ajusté pour les titres
- **Contraste fort** entre titres (Resolve 700) et texte (Inter 400)
- **Hiérarchie claire** avec des tailles bien définies

## 📦 1. Installation des Polices

### Option A : Avec Next.js App Router (Recommandé)

```tsx
// app/fonts.ts
import { Inter } from 'next/font/google'
import { Cormorant_Garamond } from 'next/font/google'
import localFont from 'next/font/local'

// Police Inter pour le corps de texte
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

// Police Cormorant Garamond pour les accents
export const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['700'],
  style: ['italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

// Police Resolve (custom) - Vous devez télécharger les fichiers
export const resolve = localFont({
  src: [
    {
      path: '../public/fonts/resolve-light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/resolve-bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-resolve',
  display: 'swap',
})
```

### Option B : Dans le layout principal

```tsx
// app/layout.tsx
import { inter, cormorantGaramond, resolve } from './fonts'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${cormorantGaramond.variable} ${resolve.variable}`}>
      <head>
        {/* Backup Google Fonts */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
```

## 📁 2. Fichiers de Polices à Télécharger

Vous devez obtenir les fichiers suivants et les placer dans `/public/fonts/` :

- `resolve-light.woff2` (weight: 300)
- `resolve-light.woff` (fallback)
- `resolve-bold.woff2` (weight: 700)
- `resolve-bold.woff` (fallback)

## 🎨 3. Configuration CSS Globale

### `/app/globals.css` ou `/styles/typography.css`

```css
/* ========================================
   VARIABLES CSS PERSONNALISÉES
   ======================================== */

:root {
  /* Polices */
  --font-primary: 'Resolve', 'Arial Black', sans-serif;
  --font-secondary: 'Inter', -apple-system, system-ui, sans-serif;
  --font-accent: 'Cormorant Garamond', Georgia, serif;
  
  /* Tailles de police - Desktop */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.85rem;      /* 13.6px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.1rem;       /* 17.6px */
  --text-xl: 1.2rem;       /* 19.2px */
  --text-2xl: 1.3rem;      /* 20.8px */
  --text-3xl: 3.5rem;      /* 56px */
  --text-4xl: 7rem;        /* 112px */
  
  /* Poids de police */
  --font-light: 300;
  --font-regular: 400;
  --font-bold: 700;
  
  /* Letter-spacing */
  --tracking-tight: -0.07em;    /* -1.12px pour 112px */
  --tracking-normal: 0.02em;    /* 0.352px pour 17.6px */
  --tracking-wide: 0.03em;      /* 0.624px pour 20.8px */
  --tracking-wider: 0.08em;     /* 0.96px pour 12px */
  
  /* Line-height */
  --leading-tight: 0.9;          /* 100.8px/112px */
  --leading-normal: 1.4;
  --leading-relaxed: 1.5;
  
  /* Couleurs */
  --color-black: rgb(17, 17, 17);
  --color-gray: rgb(85, 85, 85);
  --color-white: rgb(255, 255, 255);
}

/* ========================================
   STYLES DE BASE
   ======================================== */

body {
  font-family: var(--font-secondary);
  font-size: var(--text-base);
  font-weight: var(--font-regular);
  line-height: var(--leading-normal);
  color: var(--color-black);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ========================================
   HIÉRARCHIE TYPOGRAPHIQUE
   ======================================== */

/* Titre principal - H1 */
h1, .h1 {
  font-family: var(--font-primary);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  text-transform: uppercase;
  color: var(--color-black);
}

/* Sous-titre - H2 */
h2, .h2 {
  font-family: var(--font-primary);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-normal);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-black);
}

/* Section - H3 */
h3, .h3 {
  font-family: var(--font-primary);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-normal);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--color-white);
}

/* Sous-section - H4 */
h4, .h4 {
  font-family: var(--font-primary);
  font-size: 0.95rem;  /* 15.2px */
  font-weight: var(--font-bold);
  line-height: var(--leading-normal);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-black);
}

/* ========================================
   ÉLÉMENTS DE TEXTE
   ======================================== */

/* Paragraphes */
p {
  font-family: var(--font-secondary);
  font-size: var(--text-xl);
  font-weight: var(--font-regular);
  font-style: italic;
  line-height: var(--leading-normal);
  color: var(--color-gray);
}

/* Citations */
blockquote {
  font-family: var(--font-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-regular);
  font-style: italic;
  line-height: 1.4;
  color: var(--color-gray);
  padding-left: 2rem;
  border-left: 3px solid var(--color-gray);
}

/* ========================================
   NAVIGATION ET LIENS
   ======================================== */

/* Navigation principale */
nav a,
.nav-link,
.menu-item {
  font-family: var(--font-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-normal);
  text-transform: uppercase;
  text-decoration: none;
  color: var(--color-black);
  transition: opacity 0.2s ease;
}

nav a:hover,
.nav-link:hover {
  opacity: 0.7;
}

/* Liens généraux */
a {
  font-family: var(--font-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-normal);
  text-transform: uppercase;
  text-decoration: none;
  color: var(--color-black);
}

/* ========================================
   ÉLÉMENTS DE FORMULAIRE
   ======================================== */

/* Labels */
label,
.form-label {
  font-family: var(--font-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--color-black);
}

/* Boutons (à personnaliser selon vos besoins) */
button,
.btn {
  font-family: var(--font-primary);
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-normal);
  text-transform: uppercase;
  cursor: pointer;
}

/* ========================================
   FOOTER
   ======================================== */

footer,
footer p,
.footer-text {
  font-family: var(--font-secondary);
  font-size: var(--text-base);
  font-weight: var(--font-regular);
  color: var(--color-white);
}

/* ========================================
   RESPONSIVE TYPOGRAPHY
   ======================================== */

/* Tablette */
@media (max-width: 768px) {
  :root {
    --text-4xl: 4.5rem;     /* 72px au lieu de 112px */
    --text-3xl: 2.5rem;     /* 40px au lieu de 56px */
    --text-2xl: 1.2rem;     /* 19.2px au lieu de 20.8px */
  }
  
  .hero-badge {
    font-size: 0.7rem;
  }
  
  .hero-name {
    font-size: 0.75rem;
  }
  
  .title-main {
    font-size: clamp(2.5rem, 12vw, 4.5rem);
  }
  
  .float-btn {
    font-size: 0.6rem;
  }
}

/* Mobile */
@media (max-width: 480px) {
  :root {
    --text-4xl: 3rem;       /* 48px au lieu de 112px */
    --text-3xl: 2rem;       /* 32px au lieu de 56px */
    --text-xl: 1.1rem;      /* 17.6px au lieu de 19.2px */
    --text-lg: 1rem;        /* 16px au lieu de 17.6px */
  }
  
  .hero-name {
    font-size: 0.9rem;
  }
  
  h1 {
    letter-spacing: -0.02em;  /* Réduire le letter-spacing sur mobile */
  }
}
```

## 🎯 4. Configuration Tailwind (si utilisé)

### `tailwind.config.ts`

```js
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'resolve': ['var(--font-resolve)', 'Arial Black', 'sans-serif'],
        'inter': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'cormorant': ['var(--font-cormorant)', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-lg': ['7rem', { lineHeight: '0.9', letterSpacing: '-0.07em' }],
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '0.02em' }],
        'heading': ['1.3rem', { lineHeight: '1.4', letterSpacing: '0.03em' }],
      },
      letterSpacing: {
        'display': '-0.07em',
        'heading': '0.03em',
        'wide': '0.08em',
      },
      colors: {
        'brand-black': 'rgb(17, 17, 17)',
        'brand-gray': 'rgb(85, 85, 85)',
      },
    },
  },
  plugins: [],
}

export default config
```

## 🚀 5. Utilisation dans les Composants React/Next.js

### Exemple de composant avec les styles

```tsx
// components/Hero.tsx
import styles from './Hero.module.css'

export function Hero() {
  return (
    <section className="hero">
      <h1 className="font-resolve text-7xl font-bold tracking-display uppercase">
        Fabiani Naquet
      </h1>
      <p className="font-inter text-xl italic text-gray-600">
        Cabinet d'avocats spécialisé
      </p>
    </section>
  )
}
```

### Avec CSS Modules

```css
/* Hero.module.css */
.title {
  font-family: var(--font-primary);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  text-transform: uppercase;
}

.subtitle {
  font-family: var(--font-secondary);
  font-size: var(--text-xl);
  font-style: italic;
  color: var(--color-gray);
}
```

## 📋 6. Checklist d'Implémentation

- [ ] Télécharger les fichiers de police Resolve (.woff2 et .woff)
- [ ] Configurer les imports de polices dans Next.js
- [ ] Ajouter les variables CSS dans le fichier global
- [ ] Implémenter la hiérarchie typographique
- [ ] Tester le responsive sur différents écrans
- [ ] Vérifier le fallback des polices
- [ ] Optimiser le chargement avec `font-display: swap`
- [ ] Tester les performances avec Lighthouse

## 🔍 7. Notes Importantes

1. **Police Resolve** : C'est une police custom qui doit être obtenue séparément
2. **Uppercase** : Tous les titres et liens utilisent `text-transform: uppercase`
3. **Letter-spacing** : Critique pour reproduire le look exact - particulièrement sur les titres
4. **Fallbacks** : Arial Black est utilisé comme fallback pour Resolve
5. **Performance** : Utilisez le subset latin et font-display: swap pour optimiser

## 💡 8. Astuces pour une Reproduction Fidèle

1. **Respectez les proportions** : Le ratio entre H1 (112px) et body (16px) est de 7:1
2. **Conservez le letter-spacing négatif** sur les grands titres pour un impact visuel fort
3. **Utilisez l'italique** sur les paragraphes pour correspondre au style original
4. **Maintenez le contraste** : Noir (#111111) pour les titres, gris (#555555) pour le texte secondaire
5. **Uppercase stratégique** : Seulement pour les éléments Resolve, pas pour le texte Inter

Cette configuration vous permettra de reproduire fidèlement l'identité typographique du site Fabiani-Naquet dans votre application Next.js.