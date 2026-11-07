# Purepox — site web (FR / AR) — 100 % Cloudflare

React + Vite, déployé comme **Cloudflare Worker** (le site statique + l'API `/api/*`).
Base de données **D1**, images **R2** (optionnel). Plus de Supabase, plus de Vercel.

## Mise en ligne (tableau de bord Cloudflare)

1. **Base de données** — *Storage & databases → D1 SQL database* → `purepox` (créez-la si elle n'existe pas).
   Onglet **Console** : collez le contenu de `d1/schema.sql` → *Execute*.
   (Optionnel : `d1/sample.sql` pour 2 produits d'exemple, à supprimer ensuite depuis l'admin.)
2. **ID de la base** — sur la page de la base `purepox`, copiez le **Database ID**.
   Ouvrez `wrangler.jsonc` et remplacez `PASTE-YOUR-D1-DATABASE-ID-HERE` par cet ID.
3. **Photos produit (optionnel)** — *R2 → Create bucket* → `purepox-images`, puis décommentez le bloc `r2_buckets` dans `wrangler.jsonc`.
   (R2 demande d'enregistrer une carte. Sans R2, tout marche sauf l'envoi de photos.)
4. **Envoyer sur GitHub** (commit + push). Le Worker `purepox` se reconstruit tout seul.
   Vérifiez dans le Worker → *Settings → Build* :
   - Build command : `npm run build`
   - Deploy command : `npx wrangler deploy`
5. **Mot de passe admin** — Worker → *Settings → Variables and Secrets → Add* :
   - `ADMIN_PASSWORD` — type **Secret** — un mot de passe long (12+ caractères)
   - `SESSION_SECRET` (optionnel) — type **Secret** — une longue phrase aléatoire

   Puis relancez un déploiement (*Deployments → Retry*).
6. **Adresse** — Worker → *Settings → Domains & Routes* : activez `workers.dev` si « No URLs enabled ».
   Nom de domaine perso : *Add → Custom domain* (le domaine doit être dans votre compte Cloudflare).

Administration : `https://VOTRE-ADRESSE/admin`

## Administration
- **Commandes** : nom, téléphone (appel en un clic), détail (produit, couleur, m², kg, seaux, prix) et total. Statut modifiable. Rafraîchi toutes les 20 s.
- **Produits** : contenance du seau (kg), rendement (m² par kg), couleurs avec prix par seau, photo et description (optionnelles).
- **Contact** : téléphone, email, adresse, horaires, réseaux (site + pied de page).

## Comment ça marche
```
kg nécessaires = m² ÷ (m² couverts par 1 kg)
seaux          = arrondi supérieur (kg ÷ kg par seau)
total          = seaux × prix de la couleur choisie
```
- Le **serveur recalcule** kg, seaux et prix depuis la base : un client ne peut pas envoyer son propre prix.
- Le catalogue est servi depuis le **cache Cloudflare** (30 s) : les visiteurs touchent à peine la base. Une modification dans l'admin apparaît en ~30–50 s.
- Anti-spam : 5 commandes max par adresse IP toutes les 10 minutes. Le login admin est ralenti après un mauvais mot de passe.

## Limites du plan gratuit
Les fichiers du site sont illimités. Seuls les appels `/api/*` (catalogue, commandes, admin, images produit) comptent dans les **100 000 requêtes/jour**. Au-delà : plan Workers payant (~5 $/mois).

## Développement local
```
echo "ADMIN_PASSWORD=test1234" > .dev.vars
npm install
npx wrangler d1 execute purepox --local --file=d1/schema.sql
npx wrangler d1 execute purepox --local --file=d1/sample.sql
npm run build && npm run cf:dev        # http://localhost:8788
```
(`npm run dev` seul affiche le site avec des données d'exemple, sans API ni admin.)
