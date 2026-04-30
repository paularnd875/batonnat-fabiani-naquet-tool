#!/usr/bin/env python3
"""
Analyseur Selenium du header Fabiani-Naquet avec capture visuelle
"""

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import time
import re
from datetime import datetime

def analyze_header_with_selenium():
    """Analyse du header avec Selenium et capture d'écran"""
    
    # Configuration Chrome
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument('--window-size=1920,1080')
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        print("🔍 Ouverture du site Fabiani-Naquet...")
        driver.get("https://www.fabiani-naquet.paris/")
        
        # Attendre le chargement complet
        time.sleep(5)
        
        print("📸 Capture d'écran de la page complète...")
        driver.save_screenshot("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_PAGE_SCREENSHOT.png")
        
        # Récupérer le HTML complet
        page_source = driver.page_source
        with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_PAGE_SOURCE.html", "w", encoding="utf-8") as f:
            f.write(page_source)
        
        print("✅ HTML de la page sauvegardé")
        
        # Analyser la structure du header
        header_data = {
            "url": driver.current_url,
            "title": driver.title,
            "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "elements": {},
            "styles": {},
            "navigation": []
        }
        
        # Recherche du header avec différents sélecteurs
        header_selectors = [
            "header",
            ".header",
            "#header",
            "[role='banner']",
            ".navbar",
            ".navigation",
            ".top-bar",
            "nav",
            ".site-header"
        ]
        
        header_element = None
        for selector in header_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    header_element = elements[0]
                    print(f"✅ Header trouvé avec le sélecteur: {selector}")
                    break
            except:
                continue
        
        if not header_element:
            print("⚠️ Pas de header trouvé, analyse des premiers éléments du body...")
            body = driver.find_element(By.TAG_NAME, "body")
            # Prendre les premiers éléments visibles
            all_elements = body.find_elements(By.XPATH, ".//*")[:50]
            
            for elem in all_elements:
                try:
                    if elem.size['height'] > 20 and elem.is_displayed():
                        tag = elem.tag_name
                        classes = elem.get_attribute("class")
                        id_attr = elem.get_attribute("id")
                        
                        # Rechercher les éléments de navigation
                        if tag in ["nav", "ul", "header"] or (classes and any(x in classes.lower() for x in ["nav", "menu", "header"])):
                            header_element = elem
                            print(f"✅ Élément de navigation trouvé: {tag} - {classes}")
                            break
                except:
                    continue
        
        if header_element:
            # Extraire les informations du header
            print("\n📋 Analyse du header trouvé...")
            
            # Position et dimensions
            location = header_element.location
            size = header_element.size
            
            header_data["elements"]["header"] = {
                "tag": header_element.tag_name,
                "class": header_element.get_attribute("class"),
                "id": header_element.get_attribute("id"),
                "location": location,
                "size": size,
                "position": {
                    "x": location['x'],
                    "y": location['y'],
                    "width": size['width'],
                    "height": size['height']
                }
            }
            
            # Récupérer tous les liens de navigation
            nav_links = header_element.find_elements(By.TAG_NAME, "a")
            for link in nav_links:
                try:
                    text = link.text.strip()
                    if text:
                        nav_item = {
                            "text": text,
                            "href": link.get_attribute("href"),
                            "class": link.get_attribute("class"),
                            "position": link.location,
                            "size": link.size
                        }
                        header_data["navigation"].append(nav_item)
                except:
                    continue
            
            print(f"✅ {len(header_data['navigation'])} éléments de navigation trouvés")
            
            # Rechercher le logo
            logo_selectors = [
                "img",
                ".logo img",
                "[class*='logo'] img",
                "[id*='logo'] img",
                "a img"
            ]
            
            for selector in logo_selectors:
                try:
                    logos = header_element.find_elements(By.CSS_SELECTOR, selector)
                    if logos:
                        logo = logos[0]
                        header_data["elements"]["logo"] = {
                            "src": logo.get_attribute("src"),
                            "alt": logo.get_attribute("alt"),
                            "width": logo.size['width'],
                            "height": logo.size['height'],
                            "position": logo.location
                        }
                        print(f"✅ Logo trouvé: {header_data['elements']['logo']['src']}")
                        break
                except:
                    continue
            
            # Capture d'écran du header uniquement
            try:
                header_element.screenshot("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_ONLY.png")
                print("📸 Capture d'écran du header sauvegardée")
            except:
                pass
        
        # Récupérer les styles CSS
        print("\n🎨 Extraction des styles CSS...")
        
        # JavaScript pour récupérer tous les styles
        js_get_styles = """
        var sheets = document.styleSheets;
        var styles = [];
        for (var i = 0; i < sheets.length; i++) {
            try {
                var rules = sheets[i].cssRules || sheets[i].rules;
                for (var j = 0; j < rules.length; j++) {
                    var rule = rules[j];
                    if (rule.selectorText && 
                        (rule.selectorText.includes('header') || 
                         rule.selectorText.includes('nav') ||
                         rule.selectorText.includes('menu') ||
                         rule.selectorText.includes('logo'))) {
                        styles.push({
                            selector: rule.selectorText,
                            style: rule.style.cssText
                        });
                    }
                }
            } catch(e) {}
        }
        return styles;
        """
        
        try:
            css_styles = driver.execute_script(js_get_styles)
            header_data["styles"]["css_rules"] = css_styles[:50]  # Limiter à 50 règles
            print(f"✅ {len(css_styles)} règles CSS trouvées")
        except:
            print("⚠️ Impossible de récupérer les styles CSS")
        
        # Récupérer les couleurs utilisées
        js_get_colors = """
        var element = arguments[0] || document.body;
        var styles = window.getComputedStyle(element);
        return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            borderColor: styles.borderColor,
            borderTopColor: styles.borderTopColor,
            borderBottomColor: styles.borderBottomColor
        };
        """
        
        if header_element:
            try:
                colors = driver.execute_script(js_get_colors, header_element)
                header_data["styles"]["colors"] = colors
                print(f"✅ Couleurs extraites: {colors}")
            except:
                pass
        
        # Sauvegarder l'analyse
        with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_SELENIUM_ANALYSIS.json", "w", encoding="utf-8") as f:
            json.dump(header_data, f, indent=2, ensure_ascii=False)
        
        print("\n✅ Analyse complète sauvegardée!")
        
        # Générer le composant React/Next.js
        generate_nextjs_component(header_data)
        
        return header_data
        
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        driver.quit()

def generate_nextjs_component(data):
    """Génère un composant Next.js avec Tailwind basé sur l'analyse"""
    
    print("\n💻 Génération du composant Next.js avec Tailwind...")
    
    # Composant React avec TypeScript
    component = """'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface NavItem {
  text: string;
  href: string;
}

const FabianiNaquetHeader: React.FC = () => {
  const navItems: NavItem[] = [
"""
    
    # Ajouter les éléments de navigation
    for nav in data.get("navigation", [])[:10]:
        text = nav.get("text", "").replace('"', '\\"')
        href = nav.get("href", "#")
        component += f"""    {{ text: "{text}", href: "{href}" }},
"""
    
    component += """  ];

  return (
    <header className="w-full bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          
          {/* Logo Section */}
          <div className="flex-shrink-0">
"""
    
    if "logo" in data.get("elements", {}):
        logo = data["elements"]["logo"]
        component += f"""            <Image
              src="{logo.get('src', '/logo.png')}"
              alt="{logo.get('alt', 'Logo')}"
              width={{{logo.get('width', 200)}}}
              height={{{logo.get('height', 80)}}}
              priority
              className="h-auto w-auto"
            />
"""
    else:
        component += """            <div className="text-2xl font-bold">Logo</div>
"""
    
    component += """          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
              >
                {item.text}
              </Link>
            ))}
          </nav>
          
          {/* Mobile Menu Button */}
          <button className="md:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default FabianiNaquetHeader;
"""
    
    # Sauvegarder le composant TypeScript
    with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_NEXTJS.tsx", "w", encoding="utf-8") as f:
        f.write(component)
    
    print("✅ Composant Next.js TypeScript généré: FABIANI_HEADER_NEXTJS.tsx")
    
    # Générer les styles Tailwind suggérés
    tailwind_styles = """/* Styles Tailwind CSS pour le header Fabiani-Naquet */

/* À ajouter dans votre globals.css */
@layer components {
  .header-container {
    @apply flex items-center justify-between px-4 py-2 lg:px-8;
  }
  
  .nav-link {
    @apply text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium;
  }
  
  .nav-link-active {
    @apply text-blue-600 font-semibold;
  }
  
  .header-button {
    @apply px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200;
  }
}

/* Configuration Tailwind suggérée */
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
"""
    
    # Ajouter les couleurs extraites si disponibles
    if "colors" in data.get("styles", {}):
        colors = data["styles"]["colors"]
        tailwind_styles += f"""        'header-bg': '{colors.get("backgroundColor", "#ffffff")}',
        'header-text': '{colors.get("color", "#333333")}',
        'header-border': '{colors.get("borderColor", "#e5e5e5")}',
"""
    
    tailwind_styles += """      },
      fontFamily: {
        'header': ['Inter', 'system-ui', 'sans-serif'],
      },
    }
  }
}"""
    
    with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_TAILWIND_STYLES.css", "w", encoding="utf-8") as f:
        f.write(tailwind_styles)
    
    print("✅ Styles Tailwind générés: FABIANI_TAILWIND_STYLES.css")
    
    # Créer un rapport détaillé
    report = f"""# Analyse du Header Fabiani-Naquet

## Informations générales
- URL: {data.get('url', 'N/A')}
- Titre: {data.get('title', 'N/A')}
- Date d'analyse: {data.get('timestamp', 'N/A')}

## Structure du header
"""
    
    if "header" in data.get("elements", {}):
        header = data["elements"]["header"]
        report += f"""- Tag: {header.get('tag', 'N/A')}
- Classes: {header.get('class', 'N/A')}
- ID: {header.get('id', 'N/A')}
- Dimensions: {header.get('size', {})}
- Position: {header.get('location', {})}
"""
    
    report += f"""
## Navigation ({len(data.get('navigation', []))} éléments)
"""
    
    for nav in data.get("navigation", [])[:10]:
        report += f"- {nav.get('text', 'N/A')}: {nav.get('href', 'N/A')}\n"
    
    if "logo" in data.get("elements", {}):
        logo = data["elements"]["logo"]
        report += f"""
## Logo
- Source: {logo.get('src', 'N/A')}
- Alt: {logo.get('alt', 'N/A')}
- Dimensions: {logo.get('width', 'N/A')}x{logo.get('height', 'N/A')}px
"""
    
    report += """
## Fichiers générés
1. FABIANI_PAGE_SCREENSHOT.png - Capture d'écran complète
2. FABIANI_HEADER_ONLY.png - Capture du header uniquement
3. FABIANI_PAGE_SOURCE.html - HTML complet de la page
4. FABIANI_HEADER_NEXTJS.tsx - Composant Next.js TypeScript
5. FABIANI_TAILWIND_STYLES.css - Styles Tailwind suggérés
6. FABIANI_HEADER_SELENIUM_ANALYSIS.json - Analyse complète en JSON
"""
    
    with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_REPORT.md", "w", encoding="utf-8") as f:
        f.write(report)
    
    print("✅ Rapport détaillé généré: FABIANI_HEADER_REPORT.md")

if __name__ == "__main__":
    print("="*60)
    print("🔍 ANALYSEUR SELENIUM DU HEADER FABIANI-NAQUET")
    print("="*60)
    analyze_header_with_selenium()