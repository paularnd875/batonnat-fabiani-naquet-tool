#!/usr/bin/env python3
"""
Analyseur simplifié du header du site Fabiani-Naquet
"""

import requests
from bs4 import BeautifulSoup
import json
import re

def analyze_header_simple():
    """Analyse simplifiée du header avec requests et BeautifulSoup"""
    
    url = "https://www.fabiani-naquet.paris/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    print("🔍 Récupération de la page...")
    response = requests.get(url, headers=headers, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Erreur HTTP: {response.status_code}")
        return None
    
    print("✅ Page récupérée avec succès")
    
    # Parser le HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Sauvegarder le HTML complet pour analyse
    with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_PAGE_COMPLETE.html", "w", encoding="utf-8") as f:
        f.write(soup.prettify())
    
    # Trouver le header
    header = soup.find('header')
    if not header:
        # Essayer d'autres sélecteurs communs
        header = soup.find('div', class_=re.compile(r'header|navbar|navigation', re.I))
        if not header:
            header = soup.find('nav')
    
    if not header:
        print("⚠️ Header non trouvé, analyse de la structure globale...")
        # Analyser les premiers éléments du body
        header = soup.find('body')
        if header:
            # Prendre seulement les premiers éléments
            children = list(header.children)[:5]
    
    header_data = {
        "structure": {},
        "navigation": [],
        "elements": {},
        "classes_css": [],
        "inline_styles": {}
    }
    
    if header:
        print("\n📋 Analyse de la structure HTML du header...")
        
        # 1. Classes CSS du header
        header_classes = header.get('class', [])
        header_id = header.get('id', '')
        header_style = header.get('style', '')
        
        header_data["structure"] = {
            "tag": header.name,
            "classes": header_classes,
            "id": header_id,
            "inline_style": header_style
        }
        
        # 2. Logo
        print("🖼️ Recherche du logo...")
        logo_selectors = [
            'img',
            '.logo img',
            'a img',
            '[class*="logo"] img',
            '[id*="logo"] img'
        ]
        
        for selector in logo_selectors:
            logo = header.select_one(selector)
            if logo:
                logo_data = {
                    "src": logo.get('src', ''),
                    "alt": logo.get('alt', ''),
                    "class": logo.get('class', []),
                    "id": logo.get('id', ''),
                    "width": logo.get('width', ''),
                    "height": logo.get('height', ''),
                    "style": logo.get('style', '')
                }
                header_data["elements"]["logo"] = logo_data
                print(f"   ✅ Logo trouvé: {logo_data['src']}")
                break
        
        # 3. Navigation
        print("🧭 Analyse de la navigation...")
        nav_links = header.find_all('a', href=True)
        for link in nav_links[:20]:  # Limiter à 20 liens
            text = link.get_text(strip=True)
            if text:  # Ignorer les liens vides
                nav_item = {
                    "text": text,
                    "href": link.get('href', ''),
                    "class": link.get('class', []),
                    "id": link.get('id', ''),
                    "style": link.get('style', '')
                }
                header_data["navigation"].append(nav_item)
        
        print(f"   ✅ {len(header_data['navigation'])} liens de navigation trouvés")
        
        # 4. Éléments de contact (téléphone, email)
        print("📞 Recherche d'éléments de contact...")
        
        # Recherche de numéros de téléphone
        tel_pattern = re.compile(r'(?:(?:\+|00)33|0)[1-9](?:[\s.-]?\d{2}){4}')
        header_text = header.get_text()
        telephones = tel_pattern.findall(header_text)
        if telephones:
            header_data["elements"]["telephones"] = list(set(telephones))
            print(f"   ✅ Téléphones trouvés: {telephones}")
        
        # Recherche d'emails
        email_pattern = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
        emails = email_pattern.findall(header_text)
        if emails:
            header_data["elements"]["emails"] = list(set(emails))
            print(f"   ✅ Emails trouvés: {emails}")
        
        # 5. Boutons
        print("🔘 Recherche de boutons...")
        buttons = header.find_all(['button', 'a'], class_=re.compile(r'btn|button', re.I))
        button_data = []
        for btn in buttons[:5]:
            btn_text = btn.get_text(strip=True)
            if btn_text:
                button_data.append({
                    "text": btn_text,
                    "tag": btn.name,
                    "class": btn.get('class', []),
                    "href": btn.get('href', '') if btn.name == 'a' else '',
                    "style": btn.get('style', '')
                })
        
        if button_data:
            header_data["elements"]["buttons"] = button_data
            print(f"   ✅ {len(button_data)} boutons trouvés")
        
        # 6. Containers et structure
        print("📦 Analyse des conteneurs...")
        containers = header.find_all(['div', 'nav', 'ul'], recursive=False)
        container_info = []
        for container in containers[:5]:
            container_info.append({
                "tag": container.name,
                "class": container.get('class', []),
                "id": container.get('id', ''),
                "children_count": len(list(container.children))
            })
        header_data["structure"]["containers"] = container_info
        
        # 7. Extraire les styles inline et classes pour analyse CSS
        print("🎨 Extraction des styles...")
        all_elements = header.find_all(True)
        all_classes = set()
        inline_styles = []
        
        for elem in all_elements[:50]:  # Limiter l'analyse
            classes = elem.get('class', [])
            if classes:
                all_classes.update(classes)
            
            style = elem.get('style', '')
            if style:
                inline_styles.append({
                    "tag": elem.name,
                    "style": style
                })
        
        header_data["classes_css"] = list(all_classes)
        header_data["inline_styles"] = inline_styles[:10]  # Limiter
        
        # Sauvegarder le header HTML isolé
        with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_ISOLATED.html", "w", encoding="utf-8") as f:
            f.write(str(header))
        
    # Chercher les feuilles de style
    print("\n📄 Recherche des feuilles de style...")
    stylesheets = soup.find_all('link', rel='stylesheet')
    css_urls = []
    for sheet in stylesheets[:10]:
        href = sheet.get('href', '')
        if href:
            # Convertir en URL absolue si nécessaire
            if href.startswith('//'):
                href = 'https:' + href
            elif href.startswith('/'):
                href = 'https://www.fabiani-naquet.paris' + href
            css_urls.append(href)
    
    header_data["stylesheets"] = css_urls
    print(f"   ✅ {len(css_urls)} feuilles de style trouvées")
    
    # Sauvegarder l'analyse
    with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_ANALYSIS_SIMPLE.json", "w", encoding="utf-8") as f:
        json.dump(header_data, f, indent=2, ensure_ascii=False)
    
    print("\n✅ Analyse terminée et sauvegardée!")
    
    # Générer le composant React
    generate_react_component(header_data)
    
    return header_data

def generate_react_component(header_data):
    """Génère un composant React/Next.js avec Tailwind basé sur l'analyse"""
    
    print("\n💻 Génération du composant React/Next.js...")
    
    component = """'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const FabianiNaquetHeader = () => {
  return (
    <header className="w-full">
      {/* Conteneur principal */}
      <div className="header-container">
"""
    
    # Ajouter le logo si trouvé
    if "logo" in header_data.get("elements", {}):
        logo = header_data["elements"]["logo"]
        logo_src = logo.get('src', '/logo.png')
        logo_alt = logo.get('alt', 'Logo')
        component += f"""        
        {{/* Logo */}}
        <div className="logo-section">
          <Image 
            src="{logo_src}"
            alt="{logo_alt}"
            width={{{{200}}}}
            height={{{{80}}}}
            priority
            className="logo"
          />
        </div>
"""
    
    # Ajouter la navigation
    if header_data.get("navigation"):
        component += """        
        {{/* Navigation principale */}}
        <nav className="main-navigation">
          <ul className="nav-list">
"""
        for nav_item in header_data["navigation"][:10]:
            href = nav_item.get('href', '#')
            text = nav_item.get('text', '')
            component += f"""            <li className="nav-item">
              <Link href="{href}" className="nav-link">
                {text}
              </Link>
            </li>
"""
        component += """          </ul>
        </nav>
"""
    
    # Ajouter les boutons si trouvés
    if "buttons" in header_data.get("elements", {}):
        component += """        
        {{/* Boutons d'action */}}
        <div className="header-actions">
"""
        for button in header_data["elements"]["buttons"]:
            if button.get('href'):
                btn_href = button['href']
                btn_text = button['text']
                component += f"""          <Link href="{btn_href}" className="header-button">
            {btn_text}
          </Link>
"""
            else:
                btn_text = button['text']
                component += f"""          <button className="header-button">
            {btn_text}
          </button>
"""
        component += """        </div>
"""
    
    component += """      </div>
    </header>
  );
};

export default FabianiNaquetHeader;

/* Styles CSS suggérés basés sur l'analyse */
/*
Classes CSS trouvées dans le header original:
"""
    
    # Ajouter les classes CSS trouvées
    for css_class in header_data.get("classes_css", [])[:20]:
        component += f"- {css_class}\n"
    
    component += """
Styles inline trouvés:
"""
    for style in header_data.get("inline_styles", [])[:5]:
        component += f"- {style['tag']}: {style['style']}\n"
    
    component += """
Pour reproduire exactement le style, inspectez les feuilles de style:
"""
    for stylesheet in header_data.get("stylesheets", [])[:5]:
        component += f"- {stylesheet}\n"
    
    component += """*/"""
    
    # Sauvegarder le composant
    with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_COMPONENT_NEXTJS.tsx", "w", encoding="utf-8") as f:
        f.write(component)
    
    print("✅ Composant React/Next.js généré: FABIANI_HEADER_COMPONENT_NEXTJS.tsx")
    
    # Générer aussi un fichier de styles Tailwind suggérés
    tailwind_config = """/** Suggestions de configuration Tailwind pour le header Fabiani-Naquet */

module.exports = {
  theme: {
    extend: {
      colors: {
        // Ajoutez ici les couleurs spécifiques trouvées dans le site
        'fabiani-primary': '#color-from-analysis',
        'fabiani-secondary': '#color-from-analysis',
      },
      fontFamily: {
        // Ajoutez les polices utilisées
        'fabiani': ['Font-Name', 'sans-serif'],
      },
      spacing: {
        // Espacements personnalisés si nécessaire
      }
    }
  }
}

/** Styles CSS personnalisés à ajouter dans globals.css */
const customStyles = `
.header-container {
  @apply flex items-center justify-between px-4 py-2;
}

.logo-section {
  @apply flex items-center;
}

.main-navigation {
  @apply flex-1 px-8;
}

.nav-list {
  @apply flex items-center space-x-6;
}

.nav-item {
  @apply list-none;
}

.nav-link {
  @apply text-gray-700 hover:text-blue-600 transition-colors;
}

.header-actions {
  @apply flex items-center space-x-4;
}

.header-button {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors;
}
`;"""
    
    with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_TAILWIND_CONFIG.js", "w", encoding="utf-8") as f:
        f.write(tailwind_config)
    
    print("✅ Configuration Tailwind générée: FABIANI_TAILWIND_CONFIG.js")

if __name__ == "__main__":
    print("="*60)
    print("🔍 ANALYSEUR SIMPLIFIÉ DU HEADER FABIANI-NAQUET")
    print("="*60)
    analyze_header_simple()