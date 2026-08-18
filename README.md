# microNature — Physical Intelligence Infrastructure

microNature is **physical intelligence infrastructure** — the real-world groundwork physical intelligence runs on. Instead of bending hardware to fit a simulator, we work with the environment and the robot's own embodiment exactly as they physically are — never simplifying one to fit the other — turning the deployment site into a digital proving ground you can train on, validate against, and score.

Our process runs the full **real → sim → real** loop: capture on the real site, physics-native simulation, then back to the site for deployment — with deployment feedback flowing back into simulation. We deliver training, validation and deployment end to end, or any single stage on its own.

## Environment Affordance™

Environment Affordance™ is the core component of microNature, also available on its own. Validation starts from the robot's point of view and a specific task, inside a reusable, physically real scene:

- We re-annotate your real site as the Affordance Map against your platform specs.
- We prioritize the scenes most likely to mislead perception systems, and build sensor-deception scenes for red-team testing.
- We issue an **auditable, reproducible verdict** before deployment begins.

Unlike a general-purpose simulator, Environment Affordance™ doesn't sell you a tool or an engine — it acts as an **independent verifier** and delivers the verdict itself, generated directly from your own site data and run privately on local machines, fully compliant with domestic regulations. Deliverables include the annotation files, a standardised validation report and a scenario library. Your site data, annotation results and test reports stay on your servers and inside your network from start to finish.

## Live Site

This repository hosts the bilingual microNature website (six pages in Chinese at the root, six in English under `en/`, sharing one set of CSS/JS).

- Homepage (中文): <https://ni9htytwo.github.io/micronature-site/>
- Homepage (English): <https://ni9htytwo.github.io/micronature-site/en/index.html>

| Sheet | Page | Content |
|-------|------|---------|
| MN-00 | `index.html` | Architecture & Thesis |
| EA-01 | `environmentaffordance.html` | Environment Affordance™ |
| EA-02 | `map.html` | Map Sample |
| EA-03 | `atlas.html` | Scenario Atlas |
| MN-A1 | `insight.html` | Insight |
| MN-02 | `about.html` | About |

Each page has a Chinese version at the root and an English version under `en/`; switch with the 中 / EN toggle in the navigation bar.

## Repository Notes

- Structure conventions and the pre-upload checklist are documented in [DEPLOY.md](DEPLOY.md).
- Run `python3 check_site.py` before any upload — the last line must read「全部通过，可以上传」.

© 2026 microNature
