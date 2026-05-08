from typing import Optional

CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("food-dining", [
        "food", "catering", "restaurant", "lechon", "bakery", "cafe", "kain",
        "lutong", "kusina", "karinderya", "bbq", "grill", "dining", "eatery",
        "kainan", "carinderia",
    ]),
    ("beauty-personal-care", [
        "salon", "nails", "beauty", "spa", "hair", "barber", "lash",
        "wax", "brow", "makeup", "grooming",
    ]),
    ("remittance-travel", [
        "remittance", "padala", "travel", "forex", "visa", "money transfer",
        "balikbayan", "money", "foreign exchange",
    ]),
    ("retail-groceries", [
        "grocery", "store", "shop", "tiangge", "retail", "market",
        "sari-sari", "supermarket",
    ]),
    ("trades-home-services", [
        "plumber", "electrician", "builder", "cleaning", "painter",
        "carpenter", "renovation", "handyman", "trades", "roofing",
        "landscaping", "fencing", "maintenance",
    ]),
    ("health-wellness", [
        "nurse", "dental", "physio", "medical", "health", "clinic",
        "therapy", "care", "aged care", "physiotherapy", "doctor",
    ]),
    ("community-events", [
        "church", "community", "events", "association", "org", "fiesta",
        "festival", "cultural", "ministry", "fellowship",
    ]),
    ("professional-services", [
        "accountant", "lawyer", "bookkeeper", "consultant", "insurance",
        "notary", "tax", "mortgage", "finance", "legal", "solicitor",
        "immigration", "advisory",
    ]),
]


def categorize(name: str, description: Optional[str]) -> str:
    text = (name + " " + (description or "")).lower()
    for slug, keywords in CATEGORY_KEYWORDS:
        if any(kw in text for kw in keywords):
            return slug
    return "professional-services"
