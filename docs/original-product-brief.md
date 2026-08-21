# Original Scenic Route Product Brief

> This document preserves the original prototype/product brief that seeded the
> Scenic Route application. It is historical context, not current implementation
> documentation. For current architecture and setup, see [README.md](../README.md).

---

# Paris Wander

Build "Scenic Route" — A Paris Scenic Walking Navigation App

Create a polished, mobile-first web application called Scenic Route.

Scenic Route is navigation for curious walkers who have somewhere to go, but do not necessarily want the fastest route.

Instead of optimizing exclusively for efficiency, Scenic Route helps users get from Point A to Point B through streets, landmarks, gardens, passages, architecture, cafés, historic sites, and hidden gems that make the journey itself worthwhile.

The initial MVP should focus exclusively on walking routes in central Paris.

Core Product Concept

The central user question is:

"I'm here, I need to get there, and I have a little extra time. Show me a more interesting way to walk."

Example:

A user is near Opéra and wants to walk to Le Marais.

Instead of only showing the fastest 25-minute route, Scenic Route might offer:

Fastest — 25 min

Scenic — 34 min, +9 min

Explorer — 46 min, +21 min

The Scenic and Explorer routes should explain why they are worth the additional time.

For example:

Scenic · 34 min
+9 minutes

You'll pass:

Galerie Vivienne

Jardin du Palais Royal

Passage des Panoramas

A quieter network of historic streets

The product should make users feel that they are discovering Paris without needing to plan a sightseeing itinerary.

1. Design Direction

The app should feel:

Elegant

Parisian

Exploratory

Calm

Premium but approachable

Map-first rather than content-heavy

Modern without feeling like a generic SaaS dashboard

Avoid an overly touristy visual style.

Do not use stereotypical Eiffel Tower graphics, berets, or excessive French flag imagery.

Think:

Apple Maps × Monocle × Airbnb Experiences × a beautifully designed independent Paris travel guide

Use generous whitespace, large photography where appropriate, subtle shadows, rounded cards, and restrained typography.

Suggested visual system

Primary palette:

Warm cream / off-white background

Charcoal typography

Deep forest or muted sage accent

Muted terracotta or burgundy as a secondary accent

Soft gray map/interface elements

Typography should feel editorial and sophisticated.

Use a clean sans-serif for interface elements and optionally an elegant serif for headings or discovery-card titles.

The map should remain the dominant visual element.

2. Target User

The primary MVP user is:

A tourist, international visitor, student, temporary resident, or expat in Paris who already walks around the city and wants to discover interesting places without taking a formal tour.

They may be:

Walking from their hotel to dinner

Leaving a museum and heading toward a café

Walking between neighborhoods

Going from a Metro station to an attraction

Killing 30 to 60 minutes before a reservation

Exploring Paris without wanting to construct an itinerary

The experience should require almost no planning.

3. Geographic Scope

For the prototype, focus on central Paris:

1st arrondissement

2nd arrondissement

3rd arrondissement

4th arrondissement

5th arrondissement

6th arrondissement

7th arrondissement

Optionally the 8th arrondissement

The application architecture should eventually support additional neighborhoods and cities, but do not expose city switching prominently in the MVP.

Paris should feel like the product's natural home.

4. Primary User Flow

Home Screen

Create a full-screen or near-full-screen interactive map of Paris.

At the top, display the Scenic Route logo/name.

The primary input should resemble a navigation app:

Where are you going?

Allow:

Starting point

Current location

Search for another place

Destination

Search for address, landmark, restaurant, café, museum, park, hotel, etc.

Example:

From:
Current Location — Opéra

To:
Place des Vosges

Primary CTA:

Find my route

Below or alongside the input, include a subtle secondary option:

I have time to explore

5. Interest Personalization

Before generating scenic routes, allow the user to select interests.

Use attractive selectable chips/cards.

Options:

Architecture

Historic Paris

Hidden Gems

Parks & Gardens

Cafés

Bookshops

Art & Galleries

Food

Romantic

Quiet Streets

Local Favorites

Iconic Paris

Users can select multiple interests.

Include:

Surprise me

as an easy default.

Do not make interest selection mandatory.

The app should still work immediately for someone who just wants a scenic route.

6. Route Results

Once the user selects a start and destination, show three route options.

Fastest

Example:

Fastest
24 min
1.8 km

"Get there efficiently."

Scenic

Example:

Scenic
33 min
2.3 km
+9 min

"More beautiful streets and 4 discoveries along the way."

Explorer

Example:

Explorer
45 min
3.1 km
+21 min

"The most interesting route within your available time."

Make the Scenic route the visually recommended/default route.

Each route card should show:

Walking time

Distance

Additional time versus fastest

Number of discoveries

Match with selected interests

Example:

92% match for Architecture + Hidden Gems

Selecting a route should update the route displayed on the map.

7. Scenic Route Map

The main navigation screen should show:

User location

Destination

Scenic route polyline

Discovery stops

Walking progress

Estimated remaining time

Distance remaining

Discovery points should appear as numbered or distinctive markers along the route.

The map should make the difference between a normal route and a scenic route visually obvious.

The scenic route can intentionally deviate through:

Parks

Historic streets

Passages

Riverfront areas

Squares

Interesting architecture

Pedestrian areas

Cultural locations

8. Discovery Cards

This is a critical part of the product.

As the user travels, show small contextual cards explaining why the route passes through a location.

Example:

Galerie Vivienne

Historic Passage · Architecture

One of Paris's most elegant covered passages, opened in 1826 and known for its mosaic floors, glass roof, bookshops, and boutiques.

2 min away

Buttons:

Learn more

Save

Skip

Another example:

Rue des Barres

Hidden Gem · Historic Paris

A quiet medieval-feeling street beside Saint-Gervais that offers a dramatically different atmosphere from the larger roads nearby.

Cards should be concise.

The goal is not to become Wikipedia.

The user should understand in roughly 5 seconds:

What is this, and why is Scenic Route taking me here?

9. "Why This Route?" Feature

Every Scenic or Explorer route should include a compact explanation.

Example:

Why this route?

This walk adds 12 minutes but takes you through:

2 historic covered passages

1 garden

3 architecturally notable streets

1 lesser-known church

42% less time on major roads

Based on your interests:

Architecture · Hidden Gems · Quiet Streets

This feature is important for building trust in the routing system.

The user should never feel that the app is adding distance arbitrarily.

10. "I Have Time" Mode

Create an alternate discovery flow.

The user enters:

Where do you eventually need to be?

Then selects:

How much time do you have?

Options:

15 minutes

30 minutes

45 minutes

60 minutes

Custom

Example:

"I have 45 minutes before dinner."

Scenic Route should generate a wandering route that ends at the required destination at approximately the requested time.

Display:

45-Minute Wander

You'll discover:

Jardin Anne Frank

Hôtel de Soubise

Rue des Rosiers

Place des Vosges

Arrive around 7:25 PM

This should feel like one of the application's signature experiences.

11. Route Scoring Model

Design the product architecture around the following conceptual scoring system:

Route Score = Scenic Value + Interest Match + Landmark Quality + Street Appeal - Detour Penalty - Inconvenience Penalty

Potential scenic signals include:

Landmark density

Monuments

Historic buildings

Churches

Museums

Fountains

Visual appeal

Parks

Gardens

Plazas

Riverbanks

Pedestrian streets

Historic streets

Cultural appeal

Bookshops

Galleries

Markets

Cafés

Independent shops

Hiddenness

Favor some locations that are interesting but less obvious or less tourist-heavy.

Route comfort

Prefer:

Walkable streets

Pedestrian areas

Lower traffic

Pleasant crossings

Comfortable streets

Detour cost

Penalize routes that add excessive travel time.

User preferences

Increase the score of points matching the user's chosen interests.

For the first prototype, it is acceptable to simulate some of this logic using curated Paris locations and mocked route scoring.

Build the code so that real routing and POI APIs can replace mocked data later.

12. MVP Data Architecture

Structure the app so future integrations can include:

OpenStreetMap

Overpass API

Wikidata

OpenTripMap

Foursquare Places

Mapbox

Google Maps Platform

Do not make the prototype dependent on every API being configured.

If external credentials are unavailable, create a compelling functional prototype using:

Seeded Paris POI data

Example routes

Mock scenic scores

Realistic map interactions

Clearly isolate mocked services so they can later be swapped for production APIs.

13. Sample Paris POIs

Seed the prototype with recognizable and lesser-known places such as:

Palais Royal

Jardin du Palais Royal

Galerie Vivienne

Passage des Panoramas

Place des Vosges

Jardin Anne Frank

Hôtel de Soubise

Square du Vert-Galant

Place Dauphine

Rue des Barres

Saint-Gervais-Saint-Protais

Shakespeare and Company

Jardin du Luxembourg

Rue Mouffetard

Arènes de Lutèce

Canal Saint-Martin

Île Saint-Louis

Musée Carnavalet

Marché des Enfants Rouges

Cour du Commerce Saint-André

Give each seeded POI:

Name

Latitude/longitude

Category

Short description

Scenic score

Hidden-gem score

Historic score

Architecture score

Nature score

Food/café score

Popularity score

Suggested visit duration

14. Route Completion

When the user arrives, show:

You took the Scenic Route.

3.2 km walked
5 discoveries
18 extra minutes
Paris explored: +1 neighborhood

Then ask:

How was this route?

Use three simple options:

Loved it

It was okay

Not for me

Then:

What did you like?

Optional chips:

Beautiful streets

Hidden places

History

Architecture

Quiet route

Food & cafés

This feedback should conceptually improve future recommendations.

CTA:

Save route

Secondary:

Share route

15. Saved Routes

Create a simple Saved screen.

Cards should show:

Opéra → Le Marais
Explorer Route
45 min · 7 discoveries

Tags:
Architecture · Hidden Gems

Also allow saved individual discoveries.

Do not require an account for the prototype.

Use local storage to persist saved routes and preferences.

16. Privacy

Privacy should be treated as a product feature.

For the MVP:

Do not require account creation

Do not permanently store location history

Explain why location access is useful

Store preferences locally where practical

Only save routes when the user intentionally chooses Save

For the location permission UI, use friendly language:

Explore from where you are

Scenic Route uses your location to build walks around you. Your route history isn't saved unless you choose to save a route.

Buttons:

Use my location

Enter location manually

17. Navigation

Keep app navigation extremely simple.

Bottom mobile navigation:

Explore
Map icon

Saved
Bookmark icon

Profile
User/preferences icon

Explore should be the default.

Profile/settings can include:

Preferred interests

Walking pace

Maximum scenic detour

Distance units

Privacy

About Scenic Route

18. Maximum Detour Preference

Allow users to set how adventurous Scenic Route can be.

How scenic should your walks be?

Efficient
Up to +10 minutes

Balanced
Up to +20 minutes

Explorer
Up to +30 minutes

This should influence route generation.

19. Important Product Principles

Follow these principles throughout the application.

1. Discovery, not tourism

This should not feel like a sightseeing tour app.

The user already has somewhere to go.

Scenic Route simply makes the journey better.

2. The destination still matters

Never create a route so scenic that it becomes inconvenient.

Always communicate the added travel time.

3. Explain the algorithm

The user should understand why a route is recommended.

4. Trust over monetization

Do not include advertisements or sponsored route manipulation in this prototype.

5. Low friction

A user should be able to open the app, enter a destination, and receive a scenic route in seconds.

6. Mobile first

Assume most users are walking through Paris while holding their phone.

Design every interaction accordingly.

20. Prototype Screens

Build at minimum:

Splash / first-open experience

Map home

Destination search

Interest selection

Route comparison

Active scenic navigation

Discovery card

Expanded discovery details

Why This Route

I Have Time mode

Route completion and feedback

Saved routes

Preferences/settings

Do not build only static screens.

Create navigation and interactions between them so the application feels like a functioning MVP.

21. Demo Route

Create one particularly polished end-to-end demo:

Opéra → Place des Vosges

Generate:

Fastest
Approximately 30 minutes

Scenic
Approximately 38–42 minutes

Explorer
Approximately 50–55 minutes

The Scenic or Explorer route should intentionally surface several points such as:

Palais Royal

Galerie Vivienne

A historic covered passage

A quiet/historic street

Hôtel de Soubise or another Marais discovery

Place des Vosges

Use realistic sample descriptions and route statistics.

This demo should communicate the product's value immediately.

22. Empty and Loading States

Make the loading experience part of the brand.

Instead of:

"Loading..."

Use copy such as:

Finding the interesting way there...

Then cycle through subtle messages:

"Looking for quieter streets..."

"Checking gardens and passages..."

"Matching places to your interests..."

"Balancing discovery with your arrival time..."

For no-results states:

We couldn't find a route worth the detour.

"The fastest route may actually be your best option this time."

Do not force a scenic result when one doesn't make sense.

23. Landing Experience

On first launch, use a minimal introduction rather than a traditional marketing homepage.

Hero copy:

Take the interesting way there.

Scenic Route turns everyday walks into personalized city discovery.

Input:

Where are you going?

CTA:

Find a scenic route

Secondary explanatory text:

"Choose how much extra time you're willing to spend. We'll find something worth walking through."

Then transition directly into the map experience.

24. Brand Voice

Copy should be:

Intelligent

Curious

Understated

Friendly

Concise

Avoid exaggerated travel language such as:

"Embark on an unforgettable adventure!"

Prefer:

"There's a more interesting way there."

"Add 12 minutes. See a different side of Paris."

"Worth the detour."

"Take the interesting way."

"Found something nearby."

"Paris is better on foot."

25. Responsive Behavior

Prioritize mobile dimensions around modern iPhone and Android sizes.

Desktop should still look polished.

On mobile:

Map occupies most of the viewport

Route cards use draggable bottom sheets

Discovery cards appear above the bottom navigation

Inputs should be thumb-friendly

Avoid tiny map controls

Use large touch targets

On desktop:

Use a split screen:

Left panel: route/search/discoveries
Right panel: map

26. Technical Priorities

Prioritize:

Excellent UI

Functional map

Start/destination interaction

Multiple route choices

Seeded scenic POIs

Interest-based filtering

Route explanation

Saved routes

Responsive mobile navigation

Clean, modular code

Avoid spending excessive effort on authentication, billing, or backend infrastructure at this stage.

The goal is to validate:

Does this experience make someone want to choose Scenic Route instead of simply opening Google Maps?

27. Final Product Standard

The result should feel like an early-stage startup product that could realistically be shown to:

Potential users

HEC classmates

Paris tourists

Boutique hotels

Potential cofounders

Investors

Engineers

It should not look like a generic hackathon project.

Prioritize visual polish and the core A-to-B scenic routing interaction above feature quantity.

The moment that needs to feel magical is:

Fastest: 27 min

versus

Scenic: 39 min · +12 min

"Pass through a hidden 19th-century arcade, Palais Royal's gardens, two historic streets, and a quieter entrance into the Marais."

Then:

Take Scenic Route

That interaction is the heart of the product.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/45d449b8-5068-4cc4-82ae-e43ebde059f6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
