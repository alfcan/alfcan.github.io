#!/usr/bin/env python3
"""Sync publications from ORCID into data/publications.json."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "data" / "site-config.json"
PUBLICATIONS_PATH = ROOT / "data" / "publications.json"


def fetch_json(url: str) -> dict:
  req = Request(url, headers={"Accept": "application/json", "User-Agent": "alfcan-github-pages"})
  with urlopen(req, timeout=20) as response:
    return json.loads(response.read().decode("utf-8"))


def publication_from_work(work: dict) -> dict:
  title = (
    work.get("title", {})
    .get("title", {})
    .get("value")
  )
  journal = work.get("journal-title", {}).get("value")
  year = (
    work.get("publication-date", {})
    .get("year", {})
    .get("value")
  )
  work_type = (work.get("type") or "").replace("-", " ").title()

  external_ids = work.get("external-ids", {}).get("external-id", [])
  doi = ""
  url = ""
  for ext in external_ids:
    ext_type = (ext.get("external-id-type") or "").lower()
    ext_value = ext.get("external-id-value") or ""
    if ext_type == "doi":
      doi = ext_value
      url = f"https://doi.org/{ext_value}"
      break

  contributors = work.get("contributors", {}).get("contributor", [])
  author_names = [
    c.get("credit-name", {}).get("value")
    for c in contributors
    if c.get("credit-name", {}).get("value")
  ]
  authors = ", ".join(author_names) if author_names else "Alfonso Cannavale"

  return {
    "title": title or "Untitled",
    "authors": authors,
    "venue": journal or "",
    "year": int(year) if year and str(year).isdigit() else None,
    "type": work_type,
    "doi": doi,
    "url": url,
  }


def main() -> None:
  config = json.loads(CONFIG_PATH.read_text())
  orcid = config.get("orcid")
  if not orcid:
    raise SystemExit("No ORCID configured in data/site-config.json")

  summary_url = f"https://pub.orcid.org/v3.0/{orcid}/works"
  summary = fetch_json(summary_url)

  groups = summary.get("group", [])
  put_codes = []
  for group in groups:
    summaries = group.get("work-summary", [])
    if summaries and summaries[0].get("put-code"):
      put_codes.append(str(summaries[0].get("put-code")))

  works = []
  # Fetch in batches of 50 (ORCID API limit for bulk fetch)
  for i in range(0, len(put_codes), 50):
    batch = ",".join(put_codes[i : i + 50])
    batch_url = f"https://pub.orcid.org/v3.0/{orcid}/works/{batch}"
    batch_data = fetch_json(batch_url)
    for bulk_item in batch_data.get("bulk", []):
      if work := bulk_item.get("work"):
        works.append(publication_from_work(work))

  works = [w for w in works if w.get("title")]
  works.sort(key=lambda item: item.get("year") or 0, reverse=True)

  PUBLICATIONS_PATH.write_text(json.dumps(works, indent=2, ensure_ascii=False) + "\n")

  config["lastPublicationSync"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
  CONFIG_PATH.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n")

  print(f"Synced {len(works)} publications from ORCID {orcid}")


if __name__ == "__main__":
  main()
