# Guide d'implémentation du Header Fabiani-Naquet

## 📊 Analyse complète du header

### Structure identifiée
Le site utilise un design **Mondrian** caractéristique avec :
- Un header fixe en haut de page
- Une navigation horizontale alignée à droite
- Une bande de couleurs décorative (bleu, blanc, jaune, rouge, noir)
- Des effets de hover avec fond jaune et bordures noires

### Dimensions exactes
- **Hauteur du header** : 78px
- **Bordure inférieure** : 3px solid black
- **Padding gauche** : 48px (3rem)
- **Espacement liens** : 19.2px (1.2rem) de chaque côté
- **Bande de couleurs** : 4px de hauteur

### Couleurs utilisées
```css
--white: #FFFFFF
--black: #111111
--yellow: #FFD700 (or utilisé pour hover)
--blue: #4A90E2
--red: #E74C3C
--gray: #555555
```

### Typographie
- **Logo** : 'Resolve Sans' ou 'Inter', 700 weight, 1.1rem, uppercase
- **Navigation** : 'Inter', 500 weight, 0.8rem, uppercase
- **Letter-spacing** : 0.02em (logo), 0.05em (nav)

## 🎨 Éléments visuels

### 1. Header principal
- Position fixe en haut (z-index: 1000)
- Fond blanc avec bordure noire de 3px en bas
- Flexbox avec alignement stretch

### 2. Logo "FABIANI & NAQUET"
- Aligné à gauche avec 48px de padding
- Police bold, uppercase
- Lien vers la page d'accueil

### 3. Navigation
- 4 liens : MANIFESTE, CANDIDATS, SOUTIENS, CONTACT
- Alignement à droite
- Hover : fond jaune (#FFD700) avec bordures verticales noires

### 4. Bande Mondrian
- 5 segments de couleur égaux
- Ordre : bleu, blanc, jaune, rouge, noir
- Hauteur : 4px

## 💻 Implémentation React/Next.js

### Installation des dépendances
```bash
npm install --save-dev @types/react
```

### Utilisation du composant

1. **Copier le composant principal** :
   - Fichier : `FABIANI_HEADER_FINAL.tsx`
   - À placer dans : `src/components/Header/`

2. **Ajouter les styles CSS** :
   - Fichier : `FABIANI_HEADER_STYLES.css`
   - À importer dans `globals.css` ou directement dans le composant

3. **Configurer Tailwind** :
   - Utiliser `FABIANI_TAILWIND_CONFIG.ts`
   - Fusionner avec votre `tailwind.config.ts` existant

### Code d'intégration

```tsx
// Dans votre layout.tsx ou page principale
import FabianiNaquetHeader from '@/components/Header/FabianiNaquetHeader'

export default function Layout({ children }) {
  return (
    <>
      <FabianiNaquetHeader />
      <main>{children}</main>
    </>
  )
}
```

## 🔧 Personnalisation

### Modifier les couleurs
Dans le composant ou via CSS variables :
```css
:root {
  --yellow: #FFD700; /* Changer cette valeur */
  --blue: #4A90E2;   /* Ou celle-ci */
}
```

### Ajouter/Modifier les liens
Dans le composant :
```tsx
const navLinks = [
  { text: 'MANIFESTE', href: '#manifeste' },
  { text: 'CANDIDATS', href: '#candidats' },
  // Ajouter vos liens ici
];
```

### Adapter le responsive
Le composant inclut déjà :
- Menu burger pour mobile
- Navigation cachée sur petits écrans
- Menu mobile plein écran avec animations

## 📱 Comportement responsive

### Desktop (> 768px)
- Navigation complète visible
- Hover effects actifs
- Largeur complète

### Mobile (< 768px)
- Menu burger (3 lignes)
- Navigation cachée
- Menu plein écran au clic
- Animation de transformation du burger en X

## ⚡ Optimisations

### Performance
- Utilisation de `position: fixed` pour éviter les reflows
- Transitions CSS plutôt que JavaScript
- Classes Tailwind purgées en production

### Accessibilité
- Liens avec href appropriés
- Contraste respecté (noir sur blanc/jaune)
- Menu mobile avec aria-labels

## 🚀 Déploiement

### Vérifications avant mise en ligne
1. ✅ Tester tous les liens de navigation
2. ✅ Vérifier le responsive sur mobile/tablette
3. ✅ Contrôler les animations du menu burger
4. ✅ Valider les couleurs avec le design original
5. ✅ Tester la position fixe lors du scroll

### Fichiers à déployer
- `FABIANI_HEADER_FINAL.tsx` - Composant principal
- `FABIANI_HEADER_STYLES.css` - Styles CSS (optionnel si Tailwind)
- `FABIANI_TAILWIND_CONFIG.ts` - Configuration Tailwind

## 📝 Notes techniques

### Variables CSS importantes
```css
--bw: 3px;      /* Border width standard */
--nav-h: 78px;  /* Hauteur navigation */
```

### Classes Tailwind personnalisées utilisées
- `border-b-[3px]` - Bordure exacte
- `h-[78px]` - Hauteur du header
- `bg-[#FFD700]` - Jaune Mondrian
- `shadow-[inset_3px_0_0_black,inset_-3px_0_0_black]` - Effet hover

## 🎯 Résultat final

Le header reproduit fidèlement :
1. ✅ Le style Mondrian avec les couleurs caractéristiques
2. ✅ La typographie uppercase avec bon espacement
3. ✅ Les effets de hover jaunes avec bordures
4. ✅ La bande de couleurs décorative
5. ✅ Le comportement responsive avec menu mobile
6. ✅ La position fixe en haut de page

---

*Tous les fichiers nécessaires sont disponibles dans le répertoire du projet.*