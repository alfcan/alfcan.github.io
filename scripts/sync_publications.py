#!/usr/bin/env python3
"""Sync publications from ORCID into data/publications.json."""

from __future__ import annotations

import json
import time
import socket
import urllib.error
import http.client
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "data" / "site-config.json"
PUBLICATIONS_PATH = ROOT / "data" / "publications.json"


import re
from collections import defaultdict


def strip_html_tags(text: str) -> str:
    """Strip HTML tags (e.g. <b>, </i>) from strings."""
    if not text:
        return ""
    return re.sub(r'<[^>]*>', '', text)


def normalize_title(title: str) -> str:
    """Normalize title for comparison by removing HTML tags, special characters, and extra spaces."""
    if not title:
        return ""
    # Strip HTML tags first, then lowercase, remove non-alphanumeric, and squash whitespaces
    clean_title = strip_html_tags(title)
    return re.sub(r'[^a-z0-9]', '', clean_title.lower())


def fetch_json(url: str, max_retries: int = 5, backoff_factor: float = 2.0) -> dict:
    req = Request(url, headers={"Accept": "application/json", "User-Agent": "alfcan-github-pages"})
    last_err = None
    delay = 1.5
    for attempt in range(1, max_retries + 1):
        try:
            with urlopen(req, timeout=20) as response:
                if response.status == 200:
                    return json.loads(response.read().decode("utf-8"))
                else:
                    raise urllib.error.HTTPError(
                        url, response.status, f"HTTP Error {response.status}", response.headers, None
                    )
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in [400, 401, 403, 404]:
                print(f"HTTP {e.code} error fetching {url}. Non-retryable. Aborting.")
                raise
            print(f"HTTP {e.code} on attempt {attempt}/{max_retries} for {url}. Retrying in {delay:.1f}s...")
        except (urllib.error.URLError, http.client.HTTPException, socket.timeout, ConnectionError) as e:
            last_err = e
            print(f"Network error '{e}' on attempt {attempt}/{max_retries} for {url}. Retrying in {delay:.1f}s...")
        
        if attempt < max_retries:
            time.sleep(delay)
            delay *= backoff_factor
        
    raise IOError(f"Failed to fetch {url} after {max_retries} attempts. Last error: {last_err}")


def publication_from_work(work: dict) -> dict:
    title_info = work.get("title") or {}
    title = (title_info.get("title") or {}).get("value")
    if title:
        title = strip_html_tags(title)

    journal_info = work.get("journal-title") or {}
    journal = journal_info.get("value")
    if journal:
        journal = strip_html_tags(journal)

    pub_date = work.get("publication-date") or {}
    year = (pub_date.get("year") or {}).get("value")

    raw_type = (work.get("type") or "").upper().replace("_", " ")
    
    # Categorize into simpler types for the frontend
    if "JOURNAL" in raw_type or "ARTICLE" in raw_type:
        work_type = "Journal Article"
        category = "journal"
    elif "CONFERENCE" in raw_type or "PROCEEDINGS" in raw_type:
        work_type = "Conference Paper"
        category = "conference"
    elif "BOOK" in raw_type or "CHAPTER" in raw_type:
        work_type = "Book Chapter"
        category = "book"
    else:
        work_type = "Other (Preprint/Misc)"
        category = "other"

    external_ids_info = work.get("external-ids") or {}
    external_ids = external_ids_info.get("external-id") or []
    doi = ""
    url = ""
    for ext in external_ids:
        ext_type = (ext.get("external-id-type") or "").lower()
        ext_value = ext.get("external-id-value") or ""
        if ext_type == "doi":
            doi = ext_value
            url = f"https://doi.org/{ext_value}"
            break
        elif ext_type == "handle" or ext_type == "uri":
            url = ext_value

    contributors_info = work.get("contributors") or {}
    contributors = contributors_info.get("contributor") or []
    author_names = [
        (c.get("credit-name") or {}).get("value")
        for c in contributors
        if (c.get("credit-name") or {}).get("value")
    ]
    authors = ", ".join(author_names) if author_names else "Alfonso Cannavale"

    return {
        "title": title or "Untitled",
        "authors": authors,
        "venue": journal or "",
        "year": int(year) if year and str(year).isdigit() else None,
        "type": work_type,
        "category": category,
        "doi": doi,
        "url": url,
        "normalized_title": normalize_title(title)
    }


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text())
    orcid = config.get("orcid")
    if not orcid:
        raise SystemExit("No ORCID configured in data/site-config.json")

    # Load existing publications to preserve manual entries and custom fields (like 'pdf')
    try:
        with PUBLICATIONS_PATH.open(encoding="utf-8") as f:
            existing_works = json.load(f)
    except Exception:
        existing_works = []

    existing_map = {normalize_title(w.get("title", "")): w for w in existing_works}
    manual_works = [w for w in existing_works if w.get("manual") is True]

    summary_url = f"https://pub.orcid.org/v3.0/{orcid}/works"
    try:
        summary = fetch_json(summary_url)
    except Exception as e:
        raise SystemExit(f"Failed to fetch publication summary from ORCID: {e}")

    groups = summary.get("group") or []
    put_codes = []
    for group in groups:
        summaries = group.get("work-summary") or []
        if summaries and summaries[0].get("put-code"):
            put_codes.append(str(summaries[0].get("put-code")))

    if not put_codes:
        print("Warning: No publications found on ORCID. Skipping sync to preserve existing publications.")
        return

    raw_works = []
    for i in range(0, len(put_codes), 50):
        batch = ",".join(put_codes[i : i + 50])
        batch_url = f"https://pub.orcid.org/v3.0/{orcid}/works/{batch}"
        try:
            batch_data = fetch_json(batch_url)
        except Exception as e:
            raise SystemExit(f"Failed to fetch batch {i//50 + 1} from ORCID: {e}")
            
        for bulk_item in batch_data.get("bulk") or []:
            if not isinstance(bulk_item, dict):
                continue
            if work := bulk_item.get("work"):
                raw_works.append(publication_from_work(work))
            elif err := bulk_item.get("error"):
                print(f"Warning: ORCID returned an error for a work in batch: {err}")

    # Deduplication logic
    # Group by normalized title
    title_groups = defaultdict(list)
    for work in raw_works:
        if work["title"] != "Untitled":
            title_groups[work["normalized_title"]].append(work)

    final_works = []
    for norm_title, variants in title_groups.items():
        # If there is a manual entry in the existing publications, prefer that!
        if norm_title in existing_map and existing_map[norm_title].get("manual") is True:
            mw = existing_map[norm_title].copy()
            mw.pop("normalized_title", None)
            final_works.append(mw)
            continue

        # Prefer works with DOI, or Journal > Conference > Book Chapter > Other
        variants.sort(key=lambda x: (
            1 if x["doi"] else 0,
            3 if x["category"] == "journal" else (
                2 if x["category"] == "conference" else (
                    1 if x["category"] == "book" else 0
                )
            )
        ), reverse=True)
        # Deep clean and push the best variant
        best = variants[0]
        best.pop("normalized_title", None)
        final_works.append(best)

    # Preserve custom fields for works fetched from ORCID
    for w in final_works:
        norm = normalize_title(w.get("title", ""))
        if norm in existing_map:
            if "pdf" in existing_map[norm]:
                w["pdf"] = existing_map[norm]["pdf"]

    # Append manual works that are not already in final_works
    final_norm_titles = {normalize_title(w.get("title", "")) for w in final_works}
    for mw in manual_works:
        if normalize_title(mw.get("title", "")) not in final_norm_titles:
            mw_copy = mw.copy()
            mw_copy.pop("normalized_title", None)
            final_works.append(mw_copy)

    final_works.sort(key=lambda item: item.get("year") or 0, reverse=True)

    PUBLICATIONS_PATH.write_text(json.dumps(final_works, indent=2, ensure_ascii=False) + "\n")

    config["lastPublicationSync"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    CONFIG_PATH.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n")

    print(f"Synced {len(final_works)} deduplicated publications from ORCID {orcid}")


if __name__ == "__main__":
    main()
