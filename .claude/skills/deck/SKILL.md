---
name: deck
description: Build, adapt or revise an HTML slide deck with the deckflow workflow. Use when the user asks for a presentation, talk, pre, slides or PPT in this repo, wants an existing report or page turned into a deck, or gives slide-by-slide feedback on a deck under decks/.
---

# deck

Usage: `/deck new <name>` · `/deck adapt <name> <path-or-url>` · `/deck revise <name>` · `/deck check <name>`

Follow the protocol in `AGENTS.md`. Read `docs/workflow.md`, `docs/contract.md` and `docs/design.md` before the first edit.

- **new** → follow `entry/new.md`. Run `python tools/new.py <name>` first. Stop at gates G0 (brief) and G1 (storyboard) and wait for the user.
- **adapt** → follow `entry/adapt.md`. Inventory the original before proposing a storyboard.
- **revise** → follow `entry/revise.md`. Classify each comment (what to say / how it looks / deck-wide convention / new material) before editing. Restate ambiguous page references by slide id.
- **check** → open `decks/<name>/deck.html` in a browser, run `DeckReview.run()`, screenshot every slide, operate every control, resize once. Report errors, warnings and open items by slide id. Say plainly which of these you could not do.

With no argument, infer the entry from what the user said, and say which one you picked.

Always finish a delivery by adding a round to `decks/<name>/review.md` and, when the user wants to share it, running `python tools/build.py decks/<name>`.
