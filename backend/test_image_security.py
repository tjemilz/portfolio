#!/usr/bin/env python3
"""
Script de test pour vérifier la protection des images.

Ce script teste les différents scénarios d'accès aux images :
- Accès direct (doit être bloqué)
- Accès via API avec permissions
- Accès aux galeries publiques vs privées
"""

import requests
import sys
from colorama import init, Fore, Style

# Initialiser colorama pour les couleurs dans le terminal
init(autoreset=True)

# Configuration
BASE_URL = "http://localhost"
API_URL = f"{BASE_URL}/api"
MEDIA_URL = f"{BASE_URL}/media"


def test_direct_media_access():
    """Test 1: L'accès direct aux media doit être bloqué"""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"Test 1: Tentative d'accès direct aux images")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    test_urls = [
        f"{MEDIA_URL}/galleries/images/test.jpg",
        f"{MEDIA_URL}/galleries/public/bestof/test.jpg",
        f"{MEDIA_URL}/thumbnails/test_thumb.jpg",
    ]
    
    for url in test_urls:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 403:
                print(f"{Fore.GREEN}✓ PASS:{Style.RESET_ALL} {url}")
                print(f"  → Status: {response.status_code} Forbidden (attendu)")
            else:
                print(f"{Fore.RED}✗ FAIL:{Style.RESET_ALL} {url}")
                print(f"  → Status: {response.status_code} (403 attendu)")
                return False
        except requests.RequestException as e:
            print(f"{Fore.YELLOW}⚠ WARNING:{Style.RESET_ALL} {url}")
            print(f"  → Error: {e}")
    
    return True


def test_api_public_gallery():
    """Test 2: L'accès aux galeries publiques via API doit fonctionner"""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"Test 2: Accès aux galeries publiques via API")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    # Récupérer la liste des galeries publiques
    try:
        response = requests.get(f"{API_URL}/galleries/public/", timeout=10)
        
        if response.status_code == 200:
            galleries = response.json()
            print(f"{Fore.GREEN}✓ PASS:{Style.RESET_ALL} Récupération des galeries publiques")
            print(f"  → {len(galleries)} galerie(s) trouvée(s)")
            
            # Tester l'accès à une image si disponible
            for gallery_type, gallery_list in galleries.items():
                if gallery_list:
                    gallery = gallery_list[0]
                    print(f"\n  Test avec galerie: {gallery['name']} ({gallery['slug']})")
                    
                    # Récupérer les images de la galerie
                    images_response = requests.get(
                        f"{API_URL}/galleries/{gallery['slug']}/", 
                        timeout=10
                    )
                    
                    if images_response.status_code == 200:
                        print(f"  {Fore.GREEN}✓{Style.RESET_ALL} Accès à la galerie autorisé")
                        return True
                    else:
                        print(f"  {Fore.RED}✗{Style.RESET_ALL} Erreur d'accès à la galerie")
                        print(f"    Status: {images_response.status_code}")
                        return False
            
            return True
        else:
            print(f"{Fore.RED}✗ FAIL:{Style.RESET_ALL} Impossible de récupérer les galeries")
            print(f"  → Status: {response.status_code}")
            return False
            
    except requests.RequestException as e:
        print(f"{Fore.YELLOW}⚠ WARNING:{Style.RESET_ALL} Erreur de connexion")
        print(f"  → {e}")
        return False


def test_api_private_gallery_no_auth():
    """Test 3: L'accès aux galeries privées sans auth doit être refusé"""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"Test 3: Accès aux galeries privées sans authentification")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    # Créer une URL de galerie privée (slug hypothétique)
    private_gallery_url = f"{API_URL}/galleries/private-test/"
    
    try:
        response = requests.get(private_gallery_url, timeout=5)
        
        # On s'attend à un 404 (galerie pas trouvée) ou 401/403 (non autorisé)
        if response.status_code in [401, 403, 404]:
            print(f"{Fore.GREEN}✓ PASS:{Style.RESET_ALL} Accès refusé comme attendu")
            print(f"  → Status: {response.status_code}")
            return True
        elif response.status_code == 200:
            # Vérifier si c'est vraiment une galerie privée
            data = response.json()
            if data.get('visibility') == 'PRIVATE':
                print(f"{Fore.RED}✗ FAIL:{Style.RESET_ALL} Galerie privée accessible sans auth!")
                return False
            else:
                print(f"{Fore.YELLOW}⚠ NOTE:{Style.RESET_ALL} Galerie trouvée mais pas privée")
                return True
        else:
            print(f"{Fore.YELLOW}⚠ WARNING:{Style.RESET_ALL} Status inattendu: {response.status_code}")
            return True
            
    except requests.RequestException as e:
        print(f"{Fore.YELLOW}⚠ WARNING:{Style.RESET_ALL} Erreur de connexion")
        print(f"  → {e}")
        return False


def test_middleware_headers():
    """Test 4: Vérifier les headers de sécurité"""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"Test 4: Vérification des headers de sécurité")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    try:
        response = requests.get(f"{MEDIA_URL}/galleries/test.jpg", timeout=5)
        
        # Vérifier les headers de sécurité
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
        }
        
        all_pass = True
        for header, expected_value in security_headers.items():
            actual_value = response.headers.get(header)
            if actual_value == expected_value:
                print(f"{Fore.GREEN}✓ PASS:{Style.RESET_ALL} {header}: {actual_value}")
            else:
                print(f"{Fore.YELLOW}⚠ WARNING:{Style.RESET_ALL} {header} manquant ou incorrect")
                print(f"  Attendu: {expected_value}, Reçu: {actual_value}")
                all_pass = False
        
        return all_pass
        
    except requests.RequestException as e:
        print(f"{Fore.YELLOW}⚠ WARNING:{Style.RESET_ALL} Erreur de connexion")
        print(f"  → {e}")
        return False


def main():
    """Exécuter tous les tests"""
    print(f"\n{Fore.MAGENTA}{'='*60}")
    print(f"Tests de Sécurité des Images")
    print(f"{'='*60}{Style.RESET_ALL}")
    print(f"URL de base: {BASE_URL}")
    print(f"Assurez-vous que les services sont en cours d'exécution!\n")
    
    results = {
        "Accès direct bloqué": test_direct_media_access(),
        "API galeries publiques": test_api_public_gallery(),
        "API galeries privées": test_api_private_gallery_no_auth(),
        "Headers de sécurité": test_middleware_headers(),
    }
    
    # Résumé
    print(f"\n{Fore.MAGENTA}{'='*60}")
    print(f"Résumé des Tests")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Fore.GREEN}✓ PASS" if result else f"{Fore.RED}✗ FAIL"
        print(f"{status}{Style.RESET_ALL} - {test_name}")
    
    print(f"\n{Fore.CYAN}Résultat: {passed}/{total} tests réussis{Style.RESET_ALL}\n")
    
    if passed == total:
        print(f"{Fore.GREEN}{'='*60}")
        print(f"Tous les tests ont réussi! ✓")
        print(f"{'='*60}{Style.RESET_ALL}\n")
        return 0
    else:
        print(f"{Fore.RED}{'='*60}")
        print(f"Certains tests ont échoué!")
        print(f"{'='*60}{Style.RESET_ALL}\n")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n\n{Fore.YELLOW}Tests interrompus par l'utilisateur{Style.RESET_ALL}\n")
        sys.exit(130)
