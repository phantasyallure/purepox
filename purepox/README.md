# Purepox — site web (FR / AR)

React + Vite + Supabase, déployé sur Vercel.

## 1. Supabase
1. Créez un projet sur supabase.com.
2. **SQL Editor** → collez et exécutez `supabase/schema.sql` (tables, sécurité, bucket d'images, données d'exemple).
3. **Authentication → Users → Add user** : créez le compte admin (email + mot de passe).
   **Authentication → Providers → Email** : désactivez « Allow new users to sign up ».
4. **Project Settings → API** : copiez l'URL et la clé `anon`.

## 2. Local
```
cp .env.example .env     # collez l'URL et la clé anon
npm install
npm run dev
```
Sans `.env`, le site fonctionne en mode démo (données d'exemple, commandes non enregistrées).

## 3. Vercel
Importez le dépôt GitHub, ajoutez les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, déployez.
`vercel.json` gère le routage (`/produit/...`, `/admin`).

## Administration — `/admin`
- **Commandes** : nom, téléphone, détail (produit, couleur, m², kg, seaux, prix) et total. Statut modifiable. Mise à jour en direct.
- **Produits & prix** : par produit → contenance du seau (kg), rendement (m² par kg), prix de base, couleurs avec prix par seau, image optionnelle.
- **Contact** : téléphone, email, adresse, horaires, réseaux (affichés dans le site et le pied de page).

## Formule de calcul
```
kg nécessaires = m² ÷ (m² couverts par 1 kg)
seaux          = arrondi supérieur (kg ÷ kg par seau)
total          = seaux × prix de la couleur choisie
```
