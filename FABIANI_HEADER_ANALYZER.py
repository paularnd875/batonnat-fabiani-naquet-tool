#!/usr/bin/env python3
"""
Analyseur détaillé du header du site Fabiani-Naquet
"""

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import time
import re

def analyze_header():
    """Analyse complète du header du site"""
    
    # Configuration Selenium
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        print("🔍 Accès au site Fabiani-Naquet...")
        driver.get("https://www.fabiani-naquet.paris/")
        driver.implicitly_wait(10)
        time.sleep(3)
        
        # Attendre que le header soit chargé
        header = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "header"))
        )
        
        # Extraction de la structure
        header_data = {
            "structure": {},
            "styles": {},
            "navigation": [],
            "elements": {},
            "colors": {},
            "dimensions": {}
        }
        
        # 1. Structure HTML du header
        print("\n📋 Analyse de la structure HTML...")
        header_html = driver.execute_script("return arguments[0].outerHTML;", header)
        soup = BeautifulSoup(header_html, 'html.parser')
        
        # 2. Styles CSS du header
        print("🎨 Extraction des styles CSS...")
        header_styles = driver.execute_script("""
            var element = arguments[0];
            var styles = window.getComputedStyle(element);
            var result = {};
            for(var i = 0; i < styles.length; i++) {
                var prop = styles[i];
                result[prop] = styles.getPropertyValue(prop);
            }
            return result;
        """, header)
        
        # Filtrer les styles importants
        important_styles = [
            'background-color', 'background-image', 'background', 
            'color', 'font-family', 'font-size', 'font-weight',
            'height', 'width', 'padding', 'margin',
            'position', 'top', 'left', 'right', 'bottom',
            'display', 'flex-direction', 'justify-content', 'align-items',
            'border', 'border-radius', 'box-shadow', 'z-index'
        ]
        
        filtered_styles = {k: v for k, v in header_styles.items() if k in important_styles}
        header_data["styles"]["header"] = filtered_styles
        
        # 3. Logo
        print("🖼️ Analyse du logo...")
        try:
            logo = driver.find_element(By.CSS_SELECTOR, "header img, header .logo img, header a img, .navbar-brand img")
            logo_data = {
                "src": logo.get_attribute("src"),
                "alt": logo.get_attribute("alt"),
                "width": logo.size['width'],
                "height": logo.size['height'],
                "position": logo.location,
                "styles": driver.execute_script("""
                    var styles = window.getComputedStyle(arguments[0]);
                    return {
                        width: styles.width,
                        height: styles.height,
                        maxWidth: styles.maxWidth,
                        maxHeight: styles.maxHeight
                    };
                """, logo)
            }
            header_data["elements"]["logo"] = logo_data
        except:
            print("   ⚠️ Logo non trouvé avec sélecteur standard")
        
        # 4. Navigation
        print("🧭 Analyse de la navigation...")
        nav_items = driver.find_elements(By.CSS_SELECTOR, "header nav a, header ul li a, .navbar a, .navigation a")
        navigation_data = []
        for item in nav_items[:10]:  # Limiter aux premiers éléments
            try:
                nav_item = {
                    "text": item.text.strip(),
                    "href": item.get_attribute("href"),
                    "styles": driver.execute_script("""
                        var styles = window.getComputedStyle(arguments[0]);
                        return {
                            color: styles.color,
                            fontSize: styles.fontSize,
                            fontWeight: styles.fontWeight,
                            textDecoration: styles.textDecoration,
                            padding: styles.padding,
                            margin: styles.margin
                        };
                    """, item)
                }
                if nav_item["text"]:  # Ajouter seulement si le texte existe
                    navigation_data.append(nav_item)
            except:
                continue
        header_data["navigation"] = navigation_data
        
        # 5. Éléments décoratifs et bandes colorées
        print("🎨 Recherche d'éléments décoratifs...")
        decorative_elements = driver.find_elements(By.CSS_SELECTOR, "header .stripe, header .band, header .separator, header hr, header::before, header::after")
        for elem in decorative_elements:
            try:
                elem_styles = driver.execute_script("""
                    var styles = window.getComputedStyle(arguments[0]);
                    return {
                        backgroundColor: styles.backgroundColor,
                        height: styles.height,
                        width: styles.width,
                        borderTop: styles.borderTop,
                        borderBottom: styles.borderBottom
                    };
                """, elem)
                header_data["elements"]["decorative"] = header_data["elements"].get("decorative", [])
                header_data["elements"]["decorative"].append(elem_styles)
            except:
                continue
        
        # 6. Dimensions exactes
        print("📏 Mesure des dimensions...")
        header_rect = driver.execute_script("""
            var rect = arguments[0].getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                offsetHeight: arguments[0].offsetHeight,
                scrollHeight: arguments[0].scrollHeight
            };
        """, header)
        header_data["dimensions"] = header_rect
        
        # 7. Extraction de tous les éléments enfants du header
        print("🔍 Analyse des éléments enfants...")
        children = driver.find_elements(By.CSS_SELECTOR, "header > *, header nav, header .container")
        for i, child in enumerate(children[:5]):  # Limiter aux 5 premiers
            try:
                child_tag = child.tag_name
                child_classes = child.get_attribute("class")
                child_id = child.get_attribute("id")
                child_styles = driver.execute_script("""
                    var styles = window.getComputedStyle(arguments[0]);
                    return {
                        display: styles.display,
                        position: styles.position,
                        backgroundColor: styles.backgroundColor,
                        padding: styles.padding,
                        margin: styles.margin,
                        height: styles.height,
                        width: styles.width
                    };
                """, child)
                
                header_data["elements"][f"child_{i}"] = {
                    "tag": child_tag,
                    "classes": child_classes,
                    "id": child_id,
                    "styles": child_styles
                }
            except:
                continue
        
        # 8. Capture d'écran du header
        print("📸 Capture d'écran du header...")
        driver.save_screenshot("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_SCREENSHOT.png")
        
        # 9. HTML brut du header
        with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_HTML.html", "w", encoding="utf-8") as f:
            f.write(header_html)
        
        # 10. Sauvegarder l'analyse complète
        with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_ANALYSIS.json", "w", encoding="utf-8") as f:
            json.dump(header_data, f, indent=2, ensure_ascii=False)
        
        print("\n✅ Analyse complète terminée!")
        print(f"📊 Navigation: {len(navigation_data)} éléments trouvés")
        print(f"📐 Dimensions: {header_rect['width']}px x {header_rect['height']}px")
        
        # Générer le code Tailwind CSS
        generate_tailwind_code(header_data)
        
        return header_data
        
    except Exception as e:
        print(f"❌ Erreur lors de l'analyse: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        driver.quit()

def generate_tailwind_code(header_data):
    """Génère le code React/Tailwind pour reproduire le header"""
    
    tailwind_code = """// Header Component pour Next.js avec Tailwind CSS
// Basé sur l'analyse du site Fabiani-Naquet

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Header = () => {
  return (
    <header className="relative">
      {/* Structure analysée du header */}
      <div className="container mx-auto">
        {/* Logo */}
        <div className="logo-wrapper">
          <Image 
            src="[LOGO_URL]" 
            alt="Logo"
            width={[WIDTH]}
            height={[HEIGHT]}
          />
        </div>
        
        {/* Navigation */}
        <nav className="navigation">
"""
    
    # Ajouter les éléments de navigation
    for nav in header_data.get("navigation", []):
        tailwind_code += f"""          <Link href="{nav.get('href', '#')}">{nav.get('text', '')}</Link>
"""
    
    tailwind_code += """        </nav>
      </div>
    </header>
  );
};

export default Header;

/* Styles CSS correspondants */
const styles = `
"""
    
    # Ajouter les styles CSS extraits
    for key, value in header_data.get("styles", {}).get("header", {}).items():
        if value and value != "none" and value != "0px":
            tailwind_code += f"  {key}: {value};\n"
    
    tailwind_code += "`;"
    
    # Sauvegarder le code généré
    with open("/Users/paularnould/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/batonnat-fabiani-naquet-tool/FABIANI_HEADER_COMPONENT.jsx", "w", encoding="utf-8") as f:
        f.write(tailwind_code)
    
    print("\n💻 Code React/Tailwind généré dans FABIANI_HEADER_COMPONENT.jsx")

if __name__ == "__main__":
    print("="*60)
    print("🔍 ANALYSEUR DE HEADER FABIANI-NAQUET")
    print("="*60)
    analyze_header()