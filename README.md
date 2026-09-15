# Portail Client & Androway (React + Vite + TypeScript)

Application Web moderne et réactive issue de la migration du projet Flutter, connectée à l'ERP IntelliX Silwane et au backend FastAPI.

## Fonctionnalités Clés

- 🔐 **Authentification Client** : Connexion par code client (`CLT-0001`) et mot de passe avec gestion des tokens JWT Bearer.
- 📦 **Catalogue Produits** : Consultation des stocks en temps réel, tarifs HT/TTC, recherche textuelle dynamique et ajout au panier.
- 🛒 **Prise de Commandes** : Panier d'achat avec ajustement des quantités, saisie des instructions de livraison et génération instantanée du bon de commande.
- 📋 **Historique des Commandes** : Suivi des commandes passées avec dépliage détaillé des lignes articles.
- 📍 **Module Terrain Silwane Androway** :
  - Suivi de la tournée des clients avec indicateur de progression
  - Vente nomade / pré-commande terrain
  - Encaissement de créances en DZD (espèces, chèque, virement, BaridiMob)
  - Pointage de présence avec géolocalisation GPS
  - Enregistrement de nouveaux prospects en déplacement
  - File d'attente hors-ligne (*offline-first*) avec synchronisation automatique par batch
- 🖨️ **Caisse Comptoir POS & Ticket Thermique** :
  - Raccourcis articles rapides et scan code-barre
  - Calcul dynamique du HT, de la TVA (19%), du montant reçu et du rendu de monnaie
  - Génération de trame binaire ESC/POS 80mm et prévisualisation conforme aux tickets fiscaux algériens (IntelliX Silwane ERP)
- 💳 **Finances & Règlements** : Consultation des factures, versements et bons de vente.
- 👤 **Profil & Solde Client** : Carte de solde comptable, niveau de tarification et coordonnées complètes.

## Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement (Port 3000)
npm run dev

# Compilation pour la production
npm run build
```

## Configuration API FastAPI

L'URL du serveur backend FastAPI est configurable directement depuis le bouton Paramètres (icône d'engrenage) dans l'application, ou via la variable d'environnement `VITE_API_BASE_URL` (défaut : `http://192.168.1.70:8000`). En mode autonome ou hors-ligne, un mock local réactif assure la continuité de l'expérience utilisateur.
