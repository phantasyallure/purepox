# Purepox — site web (FR / AR) — 100 % Cloudflare

React + Vite, hébergé sur **Cloudflare Pages**. Base de données **D1**, images **R2**, API en **Pages Functions** (dossier `functions/`). Plus de Supabase, plus de Vercel.

## Mise en ligne (tout se fait dans le tableau de bord Cloudflare)

1. **Base de données** — *Workers & Pages → D1 → Create database* → nom `purepox`.
   Ouvrez l'onglet **Console**, collez le contenu de `d1/schema.sql` puis *Execute*.
   (Optionnel : même chose avec `d1/sample.sql` pour 2 produits d'exemple.)
2. **Images** — *R2 → Create bucket* → nom `purepox-images`.
   (R2 demande d'enregistrer une carte, mais le quota gratuit est large. Sans R2 le site marche, seul l'envoi de photos produit ne marche pas.)
3. **Site** — *Workers & Pages → Create → Pages → Connect to Git* → choisissez le dépôt.
   Build command : `npm run build` — Output directory : `dist`.
4. **Liaisons** — dans le projet Pages : *Settings → Bindings* :
   - **D1 database** : variable `DB` → `purepox`
   - **R2 bucket** : variable `IMAGES` → `purepox-images`

   Puis *Settings → Variables and Secrets* :
   - `ADMIN_PASSWORD` (type *Secret*) → le mot de passe de l'administration (long, 12+ caractères)
   - `SESSION_SECRET` (optionnel, *Secret*) → n'importe quelle longue phrase aléatoire

   Faites ces réglages pour *Production* (et *Preview* si besoin), puis **redéployez** (Deployments → Retry deployment).
5. Ouvrez `https://VOTRE-SITE.pages.dev/admin` et connectez-vous avec `ADMIN_PASSWORD`.

Nom de domaine : *Pages → Custom domains → Set up a domain*.

## Administration — `/admin`
- **Commandes** : nom, téléphone (appel en un clic), détail (produit, couleur, m², kg, seaux, prix) et total. Statut modifiable. Rafraîchi toutes les 20 s.
- **Produits** : contenance du seau (kg), rendement (m² par kg), couleurs avec prix par seau, photo et description (optionnelles).
- **Contact** : téléphone, email, adresse, horaires, réseaux (site + pied de page).

## Comment ça marche
```
kg nécessaires = m² ÷ (m² couverts par 1 kg)
seaux          = arrondi supérieur (kg ÷ kg par seau)
total          = seaux × prix de la couleur choisie
```
- Le **serveur recalcule** toujours kg, seaux et prix à partir de la base : un client ne peut pas envoyer son propre prix.
- Le catalogue est servi depuis le **cache Cloudflare** (30 s) : les visiteurs ne touchent presque jamais la base. Une modification dans l'admin apparaît en ~30 s.
- Protection anti-spam : 5 commandes max par adresse IP toutes les 10 minutes. Le login admin est ralenti après un mauvais mot de passe.

## Limites du plan gratuit (à connaître)
Les fichiers du site sont illimités. Les appels API (catalogue, commandes, admin, **images produit**) comptent dans les **100 000 requêtes/jour** des Functions. Au-delà : plan Workers payant (~5 $/mois, 10 M requêtes).

## Développement local
```
cp wrangler.toml.example wrangler.toml
echo "ADMIN_PASSWORD=test1234" > .dev.vars
npm install
npx wrangler d1 execute purepox --local --file=d1/schema.sql
npx wrangler d1 execute purepox --local --file=d1/sample.sql
npm run build && npm run cf:dev        # http://localhost:8788
```
(`npm run dev` seul affiche le site avec des données d'exemple, sans API ni admin.)
