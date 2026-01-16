#!/usr/bin/env powershell
# Script PowerShell pour créer des données de test

Write-Host "🚀 CRÉATION DES DONNÉES DE TEST POUR LES GROUPES ET PRIVILÈGES" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

# Vérifier si nous sommes dans le bon répertoire
if (!(Test-Path "manage.py")) {
    Write-Host "❌ Erreur: manage.py non trouvé. Assurez-vous d'être dans le répertoire backend." -ForegroundColor Red
    exit 1
}

# Vérifier si l'environnement virtuel existe
if (!(Test-Path "venv\Scripts\activate.ps1")) {
    Write-Host "❌ Erreur: Environnement virtuel non trouvé." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Activation de l'environnement virtuel..." -ForegroundColor Yellow
& ".\venv\Scripts\activate.ps1"

Write-Host "🏗️ Exécution du script de création des données..." -ForegroundColor Yellow
Get-Content "create_test_data.py" | python manage.py shell

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Données de test créées avec succès!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
    Write-Host "1. Démarrez le serveur: python manage.py runserver" -ForegroundColor White
    Write-Host "2. Connectez-vous à l'admin: http://localhost:8000/admin/" -ForegroundColor White
    Write-Host "   - Admin: test_admin / admin123" -ForegroundColor White
    Write-Host "3. Testez les API endpoints avec les différents utilisateurs" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 UTILISATEURS DE TEST:" -ForegroundColor Cyan
    Write-Host "- test_admin (Administrateur) : admin123" -ForegroundColor White
    Write-Host "- test_user1 (Groupe Famille) : user123" -ForegroundColor White
    Write-Host "- test_user2 (Groupe Amis) : user123" -ForegroundColor White
} else {
    Write-Host "❌ Erreur lors de la création des données de test." -ForegroundColor Red
    exit 1
}