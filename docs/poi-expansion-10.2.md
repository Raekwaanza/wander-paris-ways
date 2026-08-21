# Step 10.2 — curated POI expansion research

## Method

The baseline was measured directly from `CURATED_POIS` before editing. Candidate facts were
checked against official institution, monument, City of Paris, or Paris tourism pages. Names,
durable historical context, and public-facing encounter points were retained; opening hours,
prices, temporary programming, and promotional claims were deliberately omitted. Coordinates
represent an entrance, forecourt, bridge crossing, or public path rather than a feature centroid.

## Coverage audit

### Arrondissements

| Arrondissement | Before |  Added |  After |
| -------------: | -----: | -----: | -----: |
|              1 |      7 |      2 |      9 |
|              2 |      4 |      2 |      6 |
|              3 |      4 |      2 |      6 |
|              4 |      9 |      2 |     11 |
|              5 |      3 |      4 |      7 |
|              6 |      5 |      4 |      9 |
|              7 |      0 |      8 |      8 |
|              8 |      0 |      8 |      8 |
|              9 |      1 |      0 |      1 |
|             10 |      1 |      0 |      1 |
|      **Total** | **34** | **32** | **66** |

The original points were densest around Palais Royal, the passages, and the Marais. The entire
7th and 8th were empty; the southern/eastern 5th and western 6th were also comparatively thin.
The expansion therefore creates several west-bank corridors, fills the Latin Quarter garden and
monument gaps, and adds only four deliberately spaced Marais/central points.

### Interests

| Interest     | Before | After |
| ------------ | -----: | ----: |
| architecture |     19 |    40 |
| historic     |     21 |    48 |
| hidden       |     14 |    20 |
| parks        |      8 |    16 |
| cafes        |      9 |    11 |
| bookshops    |      3 |     6 |
| art          |     11 |    23 |
| food         |      6 |     7 |
| romantic     |     16 |    23 |
| quiet        |     18 |    23 |
| local        |     10 |    18 |
| iconic       |     10 |    24 |

Bookshops received the largest proportional increase. Art and parks gained useful depth, while
food and cafés grew only where an enduring, public-facing place honestly supported the tag.
`quiet` remains reserved for sheltered courtyards, passages, and tucked-away precincts.

### Categories

| Category           | Before | After |
| ------------------ | -----: | ----: |
| Bookshop           |      1 |     2 |
| Bridge             |      1 |     3 |
| Canal              |      1 |     1 |
| Church             |      2 |     7 |
| Courtyards         |      2 |     2 |
| Covered Market     |      1 |     1 |
| Fountain           |      1 |     1 |
| Garden             |      4 |     9 |
| Historic Passage   |      6 |     6 |
| Historic Street    |      2 |     2 |
| Island             |      1 |     1 |
| Mansion            |      1 |     5 |
| Market Street      |      2 |     3 |
| Museum             |      1 |    11 |
| Palace & Courtyard |      1 |     4 |
| Riverside          |      1 |     1 |
| Riverside Garden   |      1 |     1 |
| Roman Ruin         |      1 |     1 |
| Square             |      4 |     5 |

No category was introduced: all additions fit the existing canonical taxonomy without weakening
it. “Museum” is intentionally broad because the category describes encounter type, while
interests and prose supply the cultural distinction.

## New POIs and sources

Each source listed below was used as curation evidence; prose in the dataset is original.

### musee-rodin — Musée Rodin (7th)

- Why: strong art, garden, and mansion anchor in the previously empty 7th.
- Sources: [Musée Rodin — museum and gardens](https://www.musee-rodin.fr/en/musee/rodin-museum-paris), [Paris tourism](https://parisjetaime.com/eng/culture/musee-rodin-p3541).
- Anchor: the public entrance at 77 rue de Varenne; admission is required for museum/garden access.

### hotel-des-invalides — Hôtel des Invalides (7th)

- Why: defining historic and architectural axis with a substantial public exterior.
- Sources: [Musée de l'Armée — the Hôtel des Invalides](https://www.musee-armee.fr/en/your-visit/museum-spaces/the-hotel-des-invalides.html), [Paris tourism](https://parisjetaime.com/eng/culture/hotel-national-des-invalides-musee-de-l-armee-p3544).
- Anchor: north forecourt approach on Place des Invalides; interiors have controlled access.

### rue-cler — Rue Cler (7th)

- Why: food/café/local coverage away from the existing central market streets.
- Sources: [Paris tourism — Rue Cler](https://parisjetaime.com/eng/transport/rue-cler-p2009).
- Anchor: pedestrian-priority market section near rue de Grenelle, not the street's midpoint.

### champ-de-mars — Champ de Mars (7th)

- Why: major western garden corridor and durable Eiffel Tower setting.
- Sources: [City of Paris — Parc du Champ-de-Mars](https://www.paris.fr/lieux/parc-du-champ-de-mars-1807), [Paris tourism](https://parisjetaime.com/eng/culture/champ-de-mars-p967).
- Anchor: a public southern garden path near Place Joffre, avoiding a lawn centroid.

### ecole-militaire — École Militaire (7th)

- Why: architectural termination of the Champ de Mars corridor.
- Sources: [French Ministry of Armed Forces — École militaire](https://www.defense.gouv.fr/academ/lieux-prestige/lecole-militaire), [Paris tourism](https://parisjetaime.com/eng/culture/ecole-militaire-p1787).
- Anchor: public-facing north forecourt; the working institution is not presented as freely open.

### pont-alexandre-iii — Pont Alexandre III (7th)

- Why: highly encounterable bridge joining the new 7th and 8th clusters.
- Sources: [Paris tourism — Pont Alexandre III](https://parisjetaime.com/eng/transport/pont-alexandre-iii-p2008), [City of Paris history](https://www.paris.fr/pages/le-pont-alexandre-iii-1900-une-prouesse-technique-28844).
- Anchor: midpoint of the public pedestrian crossing, not a point in the Seine.

### jardin-catherine-laboure — Jardin Catherine-Labouré (7th)

- Why: genuinely tucked-away productive garden in a sparse southern corridor.
- Sources: [City of Paris — Jardin Catherine Labouré](https://www.paris.fr/lieux/jardin-catherine-laboure-1791).
- Anchor: public rue de Babylone gate; municipal opening rules apply.

### musee-quai-branly — Musée du quai Branly – Jacques Chirac (7th)

- Why: art, contemporary architecture, and planted-edge coverage near the Seine.
- Sources: [Official museum history and architecture](https://www.quaibranly.fr/en/about-the-museum/the-museum), [Official practical information](https://www.quaibranly.fr/en/informations-pratiques).
- Anchor: public entrance/garden edge on Quai Branly; galleries require admission.

### petit-palais — Petit Palais (8th)

- Why: art and 1900 architecture directly on a major pedestrian corridor.
- Sources: [Petit Palais — history of the building](https://www.petitpalais.paris.fr/en/petit-palais/history-building), [Paris Musées](https://www.parismusees.paris.fr/en/musee/petit-palais-musee-des-beaux-arts-de-la-ville-de-paris).
- Anchor: Avenue Winston-Churchill entrance and forecourt.

### grand-palais — Grand Palais (8th)

- Why: monumental architecture facing Petit Palais, distinct rather than duplicative.
- Sources: [GrandPalaisRmn — history](https://www.grandpalais.fr/en/monument/history-grand-palais), [French culture ministry](https://www.culture.gouv.fr/en/thematic-entries/architecture/grand-palais).
- Anchor: public forecourt on Avenue Winston-Churchill; interior availability can vary.

### place-de-la-concorde — Place de la Concorde (8th)

- Why: closes the Tuileries corridor and adds a historically important western square.
- Sources: [Paris tourism — Place de la Concorde](https://parisjetaime.com/eng/transport/place-de-la-concorde-p1998), [City of Paris history](https://www.paris.fr/pages/place-de-la-concorde-une-place-royale-devenue-revolutionnaire-19448).
- Anchor: pedestrian refuge near the obelisk; users must still use formal crossings.

### parc-monceau — Parc Monceau (8th)

- Why: major nature/local gap in the northern 8th, spatially separate from the palace cluster.
- Sources: [City of Paris — Parc Monceau](https://www.paris.fr/lieux/parc-monceau-1804).
- Anchor: main public entrance beside the Rotonde de Chartres on Boulevard de Courcelles.

### eglise-de-la-madeleine — Église de la Madeleine (8th)

- Why: distinctive church architecture extending discovery density north from Concorde.
- Sources: [Official parish — history and architecture](https://www.eglise-lamadeleine.com/decouvrir-la-madeleine/), [Paris tourism](https://parisjetaime.com/eng/culture/eglise-de-la-madeleine-p3535).
- Anchor: public southern steps on Place de la Madeleine.

### chapelle-expiatoire — Chapelle Expiatoire (8th)

- Why: less-obvious historic precinct between Madeleine and Saint-Lazare.
- Sources: [Centre des monuments nationaux](https://www.chapelle-expiatoire-paris.fr/en/discover/history-of-the-monument).
- Anchor: public entrance at Square Louis-XVI; monument access is controlled.

### musee-jacquemart-andre — Musée Jacquemart-André (8th)

- Why: mansion and art coverage on the otherwise sparse Boulevard Haussmann corridor.
- Sources: [Official museum — the mansion](https://www.musee-jacquemart-andre.com/en/discover/mansion), [Paris tourism](https://parisjetaime.com/eng/culture/musee-jacquemart-andre-p3545).
- Anchor: visible raised forecourt at 158 Boulevard Haussmann; galleries require admission.

### pont-de-lalma — Pont de l'Alma (8th)

- Why: useful western river crossing with a durable flood-history detail.
- Sources: [City of Paris — Pont de l'Alma](https://www.paris.fr/pages/le-pont-de-l-alma-et-son-celebre-zouave-19039), [Paris tourism](https://parisjetaime.com/eng/transport/pont-de-l-alma-p2005).
- Anchor: right-bank pedestrian approach from Place de l'Alma.

### pantheon — Panthéon (5th)

- Why: iconic historic anchor above the previously thin western Latin Quarter.
- Sources: [Centre des monuments nationaux — history](https://www.paris-pantheon.fr/en/discover/history-of-the-monument).
- Anchor: public Place du Panthéon forecourt; interior access is controlled.

### musee-de-cluny — Musée de Cluny (5th)

- Why: connects medieval art and Roman fabric in one highly legible street encounter.
- Sources: [Official museum — history of the site](https://www.musee-moyenage.fr/en/collection/history-of-the-museum.html), [Paris tourism](https://parisjetaime.com/eng/culture/musee-de-cluny-musee-national-du-moyen-age-p3547).
- Anchor: Boulevard Saint-Michel museum entrance, not the center of the thermal complex.

### college-des-bernardins — Collège des Bernardins (5th)

- Why: less-obvious Gothic architecture between the Seine and Mouffetard corridors.
- Sources: [Official history](https://www.collegedesbernardins.fr/le-college/lhistoire-du-college-des-bernardins), [Paris tourism](https://parisjetaime.com/eng/culture/college-des-bernardins-p1167).
- Anchor: public entrance at 20 rue de Poissy; event and interior access can vary.

### jardin-des-plantes — Jardin des Plantes (5th)

- Why: nature and local-route density at the eastern edge of the core MVP area.
- Sources: [Muséum national d'Histoire naturelle](https://www.jardindesplantesdeparis.fr/en), [Paris tourism](https://parisjetaime.com/eng/culture/jardin-des-plantes-p3549).
- Anchor: Place Valhubert public gate on the principal promenade axis.

### eglise-saint-sulpice — Église Saint-Sulpice (6th)

- Why: major architectural and art anchor west of the existing Cour du Commerce cluster.
- Sources: [Official parish — discover Saint-Sulpice](https://www.paroissesaintsulpice.paris/decouvrir-leglise/), [Paris tourism](https://parisjetaime.com/eng/culture/eglise-saint-sulpice-p3537).
- Anchor: public square before the west façade.

### musee-eugene-delacroix — Musée national Eugène-Delacroix (6th)

- Why: small-scale art and garden discovery reinforcing Place de Fürstenberg without duplicating it.
- Sources: [Official Louvre/Delacroix museum history](https://www.musee-delacroix.fr/en/the-museum/history-of-the-museum), [Paris tourism](https://parisjetaime.com/eng/culture/musee-national-eugene-delacroix-p3548).
- Anchor: museum entrance on Place de Fürstenberg; apartment/studio access requires admission.

### institut-de-france — Institut de France (6th)

- Why: provides the architectural endpoint that makes the Pont des Arts axis legible.
- Sources: [Institut de France — the palace](https://www.institutdefrance.fr/le-palais/), [Paris tourism](https://parisjetaime.com/eng/culture/institut-de-france-p1789).
- Anchor: public Quai de Conti frontage; no claim of routine interior access.

### ecume-des-pages — L'Écume des Pages (6th)

- Why: raises very shallow bookshop coverage with an enduring independent shop.
- Sources: [Official bookshop site](https://www.ecumedespages.com/), [Paris Librairies listing](https://www.parislibrairies.fr/librairie-159/l-ecume-des-pages/).
- Anchor: street-level entrance at 174 Boulevard Saint-Germain; commercial access applies.

### sainte-chapelle — Sainte-Chapelle (1st)

- Why: exceptional Gothic and stained-glass coverage on the Île de la Cité corridor.
- Sources: [Centre des monuments nationaux — history](https://www.sainte-chapelle.fr/en/discover/history-of-the-monument).
- Anchor: public approach at Boulevard du Palais; security/admission controls apply.

### musee-orangerie — Musée de l'Orangerie (1st)

- Why: art discovery at the under-populated western edge of the Tuileries.
- Sources: [Official museum — history](https://www.musee-orangerie.fr/en/articles/history-musee-de-lorangerie-196063), [Paris tourism](https://parisjetaime.com/eng/culture/musee-de-l-orangerie-p3554).
- Anchor: museum entrance on the public western Tuileries terrace.

### bnf-richelieu — Bibliothèque nationale de France – Richelieu (2nd)

- Why: deepens book/architecture coverage between Galerie Vivienne and Passage des Panoramas.
- Sources: [BnF — Richelieu site](https://www.bnf.fr/en/richelieu), [BnF architectural history](https://www.bnf.fr/en/richelieu-history-site).
- Anchor: public entrance at 5 rue Vivienne; reading rooms have differing access rules.

### tour-jean-sans-peur — Tour Jean-sans-Peur (2nd)

- Why: rare medieval domestic architecture, spatially distinct from the nearby passage anchors.
- Sources: [Official monument site](https://www.tourjeansanspeur.com/), [Paris tourism](https://parisjetaime.com/eng/culture/tour-jean-sans-peur-p1172).
- Anchor: street façade and entrance at 20 rue Étienne-Marcel; tower access is controlled.

### square-du-temple — Square du Temple – Elie-Wiesel (3rd)

- Why: planted local coverage beside the northern Marais market corridor.
- Sources: [City of Paris — Square du Temple](https://www.paris.fr/lieux/square-du-temple-elie-wiesel-2425).
- Anchor: rue de Bretagne public gate, rather than the pond or garden centroid.

### musee-picasso-paris — Musée national Picasso-Paris (3rd)

- Why: combines major art depth with the architecture of the Hôtel Salé.
- Sources: [Official museum — Hôtel Salé](https://www.museepicassoparis.fr/en/hotel-sale), [Paris tourism](https://parisjetaime.com/eng/culture/musee-national-picasso-paris-p3559).
- Anchor: public entrance at 5 rue de Thorigny; galleries require admission.

### hotel-de-sens — Hôtel de Sens (4th)

- Why: rare medieval mansion on a route gap between Saint-Paul and the Seine.
- Sources: [City of Paris — Bibliothèque Forney/Hôtel de Sens](https://www.paris.fr/lieux/bibliotheque-forney-18), [Paris tourism](https://parisjetaime.com/eng/culture/hotel-de-sens-p1792).
- Anchor: public corner at rues du Figuier and de l'Ave-Maria; library access has rules.

### memorial-de-la-shoah — Mémorial de la Shoah (4th)

- Why: essential, sober historic context in the Marais, deliberately not scored as conventional spectacle.
- Sources: [Official memorial — presentation](https://www.memorialdelashoah.org/en/the-memorial/the-shoah-memorial-in-paris.html), [Paris tourism](https://parisjetaime.com/eng/culture/memorial-de-la-shoah-p3562).
- Anchor: public forecourt at 17 rue Geoffroy-l'Asnier; respectful conduct and security apply.

## Coordinate and duplicate review

Coordinates were cross-checked against official street addresses and map positions, then placed at
public pedestrian encounter points. The closest intentional relationships are Petit Palais/Grand
Palais (opposing, independently significant buildings), Musée Delacroix/Place de Fürstenberg
(museum and public square), and BnF Richelieu/Galerie Vivienne (institution and passage). None is a
second point for the same attraction. No existing record was edited.

Candidates omitted included Arc de Triomphe (outside the desired corridor-density balance), Café
de Flore and Les Deux Magots (too close together and likely to over-concentrate one commercial
corner), and additional Champ de Mars/Eiffel Tower anchors (duplicate representations of one large
feature). Private mansion courtyards with uncertain routine access were also rejected.

## Score calibration review

Scores use the existing 0–10 editorial scale. Globally known monuments generally have low hidden
scores; gardens alone receive high nature scores; only Rue Cler has high food relevance. The new
batch contains 11 POIs with scenic scores of 9–10 and 15 with historic scores of 9–10, leaving
substantial midrange differentiation. Scores remain internal data and are not user-facing.

## Route sanity check

No real route sanity test was run because `OPENROUTESERVICE_API_KEY` is present but empty in the
local environment. Routing, candidate generation, the 120 m corridor, scoring weights, Scenic and
Explorer selection, navigation, and persistence were not changed.

## Remaining gaps and next step

The 9th and 10th remain shallow, and café/food coverage remains conservative. A future expansion
could research the Opéra–Nouvelle Athènes and southern canal corridors, plus a small number of
enduring food institutions, after systematic route evaluation. The recommended engineering next
step remains 11.1 Real Wander; no second POI batch is implemented here.
