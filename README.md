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

## Quick updates

1. Edit `data/profile.json`.
2. (Optional) Run the sync script.
3. Commit and push.

No template editing is needed for regular updates.
