#!/usr/bin/env python3
"""
Analyseur typographique du site Fabiani-Naquet
Extrait toutes les informations sur les polices et styles utilisés
"""

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime
import re

def setup_driver():
    """Configure le driver Chrome avec les options nécessaires"""
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument('--window-size=1920,1080')
    
    driver = webdriver.Chrome(options=chrome_options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

def extract_typography_info(driver):
    """Extrait toutes les informations typographiques du site"""
    
    print("\n🔍 Analyse typographique du site Fabiani-Naquet...")
    print("=" * 80)
    
    # Charger la page
    url = "https://www.fabiani-naquet.paris/"
    driver.get(url)
    time.sleep(3)
    
    # Accepter les cookies si nécessaire
    try:
        cookie_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Accepter') or contains(text(), 'Accept') or contains(@class, 'accept')]")
        cookie_button.click()
        time.sleep(1)
    except:
        pass
    
    typography_data = {
        "url": url,
        "date_analyse": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "imports_fonts": [],
        "font_faces": [],
        "elements_typography": {},
        "computed_styles": {},
        "css_rules": [],
        "google_fonts": [],
        "adobe_fonts": [],
        "custom_fonts": []
    }
    
    # 1. Extraire les imports de polices dans le <head>
    print("\n📦 Extraction des imports de polices...")
    links = driver.find_elements(By.TAG_NAME, "link")
    for link in links:
        href = link.get_attribute("href") or ""
        rel = link.get_attribute("rel") or ""
        
        if "fonts.googleapis.com" in href:
            typography_data["google_fonts"].append(href)
            print(f"  ✓ Google Fonts: {href}")
            
        elif "use.typekit.net" in href or "fonts.adobe.com" in href:
            typography_data["adobe_fonts"].append(href)
            print(f"  ✓ Adobe Fonts: {href}")
            
        elif "font" in href.lower() or "stylesheet" in rel:
            if "fonts" in href.lower():
                typography_data["imports_fonts"].append(href)
                print(f"  ✓ Import font: {href}")
    
    # 2. Extraire les @font-face depuis les styles
    print("\n🎨 Extraction des règles @font-face...")
    style_sheets_script = """
    let fontFaces = [];
    for (let sheet of document.styleSheets) {
        try {
            for (let rule of sheet.cssRules) {
                if (rule.type === CSSRule.FONT_FACE_RULE) {
                    fontFaces.push({
                        fontFamily: rule.style.fontFamily,
                        src: rule.style.src,
                        fontWeight: rule.style.fontWeight || 'normal',
                        fontStyle: rule.style.fontStyle || 'normal'
                    });
                }
            }
        } catch(e) {}
    }
    return fontFaces;
    """
    font_faces = driver.execute_script(style_sheets_script)
    typography_data["font_faces"] = font_faces
    
    for ff in font_faces:
        print(f"  ✓ @font-face: {ff.get('fontFamily')} - {ff.get('fontWeight')}")
    
    # 3. Analyser les styles computés des éléments principaux
    print("\n📏 Analyse de la hiérarchie typographique...")
    
    elements_to_check = [
        ("H1", "h1"),
        ("H2", "h2"),
        ("H3", "h3"),
        ("H4", "h4"),
        ("H5", "h5"),
        ("H6", "h6"),
        ("Body", "body"),
        ("Paragraphe", "p"),
        ("Navigation", "nav a, .nav a, .menu a"),
        ("Boutons", "button, .btn, .button, a.btn"),
        ("Footer", "footer, footer p"),
        ("Header", "header, .header"),
        ("Logo texte", ".logo, .site-title, .brand"),
        ("Citations", "blockquote, .quote"),
        ("Labels", "label"),
        ("Liens", "a"),
        ("Listes", "li"),
        ("Sous-titres", ".subtitle, .lead"),
        ("Menu principal", ".main-menu a, .primary-menu a"),
        ("Breadcrumb", ".breadcrumb"),
        ("Cards", ".card-title, .card-text")
    ]
    
    for name, selector in elements_to_check:
        try:
            # Essayer plusieurs sélecteurs
            selectors_to_try = selector.split(", ")
            for sel in selectors_to_try:
                elements = driver.find_elements(By.CSS_SELECTOR, sel)
                if elements:
                    element = elements[0]
                    
                    # Extraire les styles computés via JavaScript
                    styles_script = f"""
                    let element = document.querySelector('{sel}');
                    if (element) {{
                        let computed = window.getComputedStyle(element);
                        return {{
                            fontFamily: computed.fontFamily,
                            fontSize: computed.fontSize,
                            fontWeight: computed.fontWeight,
                            fontStyle: computed.fontStyle,
                            lineHeight: computed.lineHeight,
                            letterSpacing: computed.letterSpacing,
                            textTransform: computed.textTransform,
                            color: computed.color,
                            textDecoration: computed.textDecoration,
                            textAlign: computed.textAlign,
                            fontVariant: computed.fontVariant,
                            fontFeatureSettings: computed.fontFeatureSettings
                        }};
                    }}
                    return null;
                    """
                    
                    computed_styles = driver.execute_script(styles_script)
                    
                    if computed_styles:
                        typography_data["computed_styles"][name] = {
                            "selector": sel,
                            "styles": computed_styles
                        }
                        
                        print(f"\n  📌 {name} ({sel}):")
                        print(f"     Font: {computed_styles.get('fontFamily', 'N/A')}")
                        print(f"     Size: {computed_styles.get('fontSize', 'N/A')}")
                        print(f"     Weight: {computed_styles.get('fontWeight', 'N/A')}")
                        print(f"     Line-height: {computed_styles.get('lineHeight', 'N/A')}")
                        if computed_styles.get('letterSpacing') != 'normal':
                            print(f"     Letter-spacing: {computed_styles.get('letterSpacing', 'N/A')}")
                        break
        except Exception as e:
            continue
    
    # 4. Extraire toutes les font-family uniques utilisées
    print("\n🔤 Polices uniques détectées...")
    all_fonts_script = """
    let allFonts = new Set();
    let allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        let computed = window.getComputedStyle(el);
        if (computed.fontFamily) {
            allFonts.add(computed.fontFamily);
        }
    });
    return Array.from(allFonts);
    """
    
    unique_fonts = driver.execute_script(all_fonts_script)
    typography_data["unique_fonts"] = unique_fonts
    
    for font in unique_fonts:
        print(f"  • {font}")
    
    # 5. Analyser les media queries pour la typographie responsive
    print("\n📱 Analyse de la typographie responsive...")
    media_queries_script = """
    let mediaQueries = [];
    for (let sheet of document.styleSheets) {
        try {
            for (let rule of sheet.cssRules) {
                if (rule.type === CSSRule.MEDIA_RULE) {
                    let fontRules = [];
                    for (let r of rule.cssRules) {
                        if (r.style && (r.style.fontSize || r.style.fontFamily || r.style.lineHeight)) {
                            fontRules.push({
                                selector: r.selectorText,
                                fontSize: r.style.fontSize,
                                fontFamily: r.style.fontFamily,
                                lineHeight: r.style.lineHeight
                            });
                        }
                    }
                    if (fontRules.length > 0) {
                        mediaQueries.push({
                            media: rule.media.mediaText,
                            rules: fontRules
                        });
                    }
                }
            }
        } catch(e) {}
    }
    return mediaQueries;
    """
    
    media_queries = driver.execute_script(media_queries_script)
    typography_data["media_queries"] = media_queries
    
    if media_queries:
        for mq in media_queries:
            print(f"  @media {mq['media']}: {len(mq['rules'])} règles typographiques")
    
    # 6. Extraire les variables CSS pour la typographie
    print("\n🎯 Variables CSS typographiques...")
    css_vars_script = """
    let computed = getComputedStyle(document.documentElement);
    let cssVars = {};
    for (let prop of computed) {
        if (prop.startsWith('--') && 
            (prop.includes('font') || prop.includes('text') || 
             prop.includes('heading') || prop.includes('body') ||
             prop.includes('line') || prop.includes('letter'))) {
            cssVars[prop] = computed.getPropertyValue(prop);
        }
    }
    return cssVars;
    """
    
    css_variables = driver.execute_script(css_vars_script)
    typography_data["css_variables"] = css_variables
    
    if css_variables:
        for var, value in css_variables.items():
            print(f"  {var}: {value}")
    
    return typography_data

def generate_nextjs_config(typography_data):
    """Génère la configuration pour Next.js"""
    
    print("\n\n" + "=" * 80)
    print("🚀 CONFIGURATION POUR NEXT.JS")
    print("=" * 80)
    
    # Analyser les Google Fonts
    if typography_data["google_fonts"]:
        print("\n📌 IMPORTS GOOGLE FONTS:")
        print("-" * 40)
        for url in typography_data["google_fonts"]:
            print(f"\n// Dans app/layout.tsx ou _document.tsx:")
            print(f'<link href="{url}" rel="stylesheet" />')
            
            # Extraire les familles de polices
            if "family=" in url:
                families = url.split("family=")[1].split("&")[0]
                print(f"\n// Ou avec next/font/google:")
                families_list = families.split("|") if "|" in families else [families]
                for family in families_list:
                    clean_family = family.split(":")[0].replace("+", " ")
                    var_name = clean_family.replace(" ", "_").lower()
                    print(f"""
import {{ {clean_family.replace(" ", "_")} }} from 'next/font/google'

const {var_name} = {clean_family.replace(" ", "_")}({{
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-{var_name.replace("_", "-")}'
}})
""")
    
    print("\n📌 FICHIER CSS/SCSS GLOBAL:")
    print("-" * 40)
    print("\n/* globals.css ou styles/typography.scss */\n")
    
    # Variables CSS
    if typography_data.get("css_variables"):
        print(":root {")
        for var, value in typography_data["css_variables"].items():
            print(f"  {var}: {value};")
        print("}\n")
    
    # Styles computés
    if typography_data.get("computed_styles"):
        print("/* Hiérarchie typographique */\n")
        
        for element, data in typography_data["computed_styles"].items():
            selector = data["selector"]
            styles = data["styles"]
            
            # Nettoyer le sélecteur pour CSS
            clean_selector = selector.split(",")[0].strip()
            
            print(f"/* {element} */")
            print(f"{clean_selector} {{")
            
            if styles.get("fontFamily"):
                print(f"  font-family: {styles['fontFamily']};")
            if styles.get("fontSize"):
                print(f"  font-size: {styles['fontSize']};")
            if styles.get("fontWeight"):
                print(f"  font-weight: {styles['fontWeight']};")
            if styles.get("lineHeight"):
                print(f"  line-height: {styles['lineHeight']};")
            if styles.get("letterSpacing") and styles["letterSpacing"] != "normal":
                print(f"  letter-spacing: {styles['letterSpacing']};")
            if styles.get("textTransform") and styles["textTransform"] != "none":
                print(f"  text-transform: {styles['textTransform']};")
            if styles.get("color"):
                print(f"  color: {styles['color']};")
            
            print("}\n")
    
    # Media queries
    if typography_data.get("media_queries"):
        print("/* Responsive Typography */\n")
        for mq in typography_data["media_queries"]:
            print(f"@media {mq['media']} {{")
            for rule in mq["rules"][:3]:  # Limiter à 3 exemples
                if rule["selector"]:
                    print(f"  {rule['selector']} {{")
                    if rule.get("fontSize"):
                        print(f"    font-size: {rule['fontSize']};")
                    if rule.get("lineHeight"):
                        print(f"    line-height: {rule['lineHeight']};")
                    print("  }")
            print("}\n")
    
    print("\n📌 TAILWIND CONFIG (si utilisé):")
    print("-" * 40)
    print("""
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {""")
    
    # Extraire les noms de polices principaux
    if typography_data.get("unique_fonts"):
        for font in typography_data["unique_fonts"][:5]:  # Top 5 polices
            # Nettoyer et formater pour Tailwind
            font_parts = font.split(",")
            if font_parts:
                primary_font = font_parts[0].strip().strip('"').strip("'")
                safe_name = primary_font.lower().replace(" ", "-")
                print(f"        '{safe_name}': ['{primary_font}', ...defaultTheme.fontFamily.sans],")
    
    print("""      }
    }
  }
}
""")

def save_results(typography_data):
    """Sauvegarde les résultats dans des fichiers"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # JSON complet
    json_file = f"FABIANI_NAQUET_TYPOGRAPHY_{timestamp}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(typography_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Données sauvegardées dans: {json_file}")
    
    # Rapport texte
    report_file = f"FABIANI_NAQUET_TYPOGRAPHY_REPORT_{timestamp}.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("ANALYSE TYPOGRAPHIQUE - FABIANI-NAQUET.PARIS\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Date: {typography_data['date_analyse']}\n")
        f.write(f"URL: {typography_data['url']}\n\n")
        
        if typography_data["google_fonts"]:
            f.write("GOOGLE FONTS:\n")
            for url in typography_data["google_fonts"]:
                f.write(f"  - {url}\n")
            f.write("\n")
        
        if typography_data["unique_fonts"]:
            f.write("POLICES UNIQUES UTILISÉES:\n")
            for font in typography_data["unique_fonts"]:
                f.write(f"  - {font}\n")
            f.write("\n")
        
        if typography_data["computed_styles"]:
            f.write("HIÉRARCHIE TYPOGRAPHIQUE:\n")
            f.write("-" * 40 + "\n")
            for element, data in typography_data["computed_styles"].items():
                f.write(f"\n{element}:\n")
                styles = data["styles"]
                f.write(f"  Sélecteur: {data['selector']}\n")
                f.write(f"  Police: {styles.get('fontFamily', 'N/A')}\n")
                f.write(f"  Taille: {styles.get('fontSize', 'N/A')}\n")
                f.write(f"  Poids: {styles.get('fontWeight', 'N/A')}\n")
                f.write(f"  Hauteur de ligne: {styles.get('lineHeight', 'N/A')}\n")
                if styles.get('letterSpacing') != 'normal':
                    f.write(f"  Espacement lettres: {styles.get('letterSpacing', 'N/A')}\n")
    
    print(f"✅ Rapport sauvegardé dans: {report_file}")
    
    # Configuration Next.js
    nextjs_file = f"FABIANI_NAQUET_NEXTJS_CONFIG_{timestamp}.md"
    with open(nextjs_file, 'w', encoding='utf-8') as f:
        f.write("# Configuration typographique pour Next.js\n\n")
        f.write("## Imports nécessaires\n\n")
        
        if typography_data["google_fonts"]:
            f.write("### Google Fonts\n")
            f.write("```html\n")
            for url in typography_data["google_fonts"]:
                f.write(f'<link href="{url}" rel="stylesheet" />\n')
            f.write("```\n\n")
        
        f.write("## Styles CSS\n\n")
        f.write("```css\n")
        
        if typography_data.get("computed_styles"):
            for element, data in typography_data["computed_styles"].items():
                selector = data["selector"].split(",")[0].strip()
                styles = data["styles"]
                
                f.write(f"/* {element} */\n")
                f.write(f"{selector} {{\n")
                
                if styles.get("fontFamily"):
                    f.write(f"  font-family: {styles['fontFamily']};\n")
                if styles.get("fontSize"):
                    f.write(f"  font-size: {styles['fontSize']};\n")
                if styles.get("fontWeight"):
                    f.write(f"  font-weight: {styles['fontWeight']};\n")
                if styles.get("lineHeight"):
                    f.write(f"  line-height: {styles['lineHeight']};\n")
                if styles.get("letterSpacing") and styles["letterSpacing"] != "normal":
                    f.write(f"  letter-spacing: {styles['letterSpacing']};\n")
                
                f.write("}\n\n")
        
        f.write("```\n")
    
    print(f"✅ Config Next.js sauvegardée dans: {nextjs_file}")
    
    return json_file, report_file, nextjs_file

def main():
    """Fonction principale"""
    driver = None
    
    try:
        # Initialiser le driver
        driver = setup_driver()
        
        # Extraire les informations typographiques
        typography_data = extract_typography_info(driver)
        
        # Générer la configuration Next.js
        generate_nextjs_config(typography_data)
        
        # Sauvegarder les résultats
        json_file, report_file, nextjs_file = save_results(typography_data)
        
        print("\n" + "=" * 80)
        print("✅ ANALYSE TERMINÉE AVEC SUCCÈS!")
        print("=" * 80)
        print(f"\n📁 Fichiers générés:")
        print(f"  • {json_file} - Données complètes en JSON")
        print(f"  • {report_file} - Rapport détaillé")
        print(f"  • {nextjs_file} - Configuration Next.js prête à l'emploi")
        
    except Exception as e:
        print(f"\n❌ Erreur lors de l'analyse: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    main()