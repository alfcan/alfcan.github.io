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
  work_type = work.get("type", "").replace("-", " ").title()

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

  return {
    "title": title or "Untitled",
    "authors": "Alfonso Cannavale et al.",
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
  works = []
  for group in groups:
    summaries = group.get("work-summary", [])
    if not summaries:
      continue
    put_code = summaries[0].get("put-code")
    if not put_code:
      continue
    detail_url = f"https://pub.orcid.org/v3.0/{orcid}/work/{put_code}"
    work = fetch_json(detail_url)
    works.append(publication_from_work(work))

  works = [w for w in works if w.get("title")]
  works.sort(key=lambda item: item.get("year") or 0, reverse=True)

  PUBLICATIONS_PATH.write_text(json.dumps(works, indent=2, ensure_ascii=False) + "\n")

  config["lastPublicationSync"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
  CONFIG_PATH.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n")

  print(f"Synced {len(works)} publications from ORCID {orcid}")


if __name__ == "__main__":
  main()
