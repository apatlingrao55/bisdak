from typing import Optional

REGION_MAP: list[tuple[str, list[str]]] = [
    ("auckland", [
        "auckland", "manukau", "waitakere", "north shore", "henderson",
        "otahuhu", "papakura", "pukekohe", "botany", "howick", "albany",
        "takapuna", "newmarket", "mt eden", "mount eden", "ponsonby",
        "glen innes", "east tamaki", "flat bush",
    ]),
    ("wellington", [
        "wellington", "lower hutt", "upper hutt", "porirua", "kapiti",
        "paraparaumu", "petone", "hutt valley",
    ]),
    ("canterbury", [
        "christchurch", "canterbury", "selwyn", "waimakariri",
        "rangiora", "rolleston",
    ]),
    ("waikato", [
        "hamilton", "waikato", "cambridge", "te awamutu", "te kauwhata",
    ]),
    ("bay-of-plenty", [
        "tauranga", "bay of plenty", "rotorua", "whakatane", "mount maunganui",
        "papamoa", "katikati",
    ]),
]


def map_region(location_text: Optional[str]) -> Optional[str]:
    if not location_text:
        return None
    text = location_text.lower()
    for slug, keywords in REGION_MAP:
        if any(kw in text for kw in keywords):
            return slug
    return None
