# alfcan.github.io

Personal GitHub Pages website for Alfonso Cannavale.

## Content-first structure

All website content is loaded from JSON files in `/data`:

- `data/profile.json` → Bio, links, interests, students, future projects/teaching.
- `data/publications.json` → Publications rendered in the Publications section.
- `data/site-config.json` → ORCID and sync metadata.

## Automatic publications update (ORCID)

You can sync publications from ORCID with:

```bash
python scripts/sync_publications.py
```

A GitHub Actions workflow also runs weekly and on demand.

Replication packages and appendices (titles starting with "Replication Package", "Appendix",
"Supplementary Material") are not listed as publications: the sync attaches them to their paper
as a link (`artifacts` field), matching by title.

## Academic CV (LaTeX)

```bash
python scripts/build_cv.py   # writes cv/cv.tex from data/*.json
```

The `cv/` folder is git-ignored: the CV is generated and compiled locally and is never
published on the website. Sections the website does not cover (education, awards, service) can be
added in an optional `data/cv-extra.json`; the format is described at the top of the script.

## Quick updates

1. Edit `data/profile.json`.
2. (Optional) Run the sync script.
3. Commit and push.

No template editing is needed for regular updates.
