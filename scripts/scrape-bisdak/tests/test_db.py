import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db import slugify, make_unique_slug

def test_slugify_basic():
    assert slugify("Aling Rosa Catering") == "aling-rosa-catering"

def test_slugify_special_chars():
    assert slugify("Pinoy's Grill & BBQ!") == "pinoys-grill-bbq"

def test_slugify_multiple_spaces():
    assert slugify("  Hello   World  ") == "hello-world"

def test_make_unique_slug_no_conflict():
    existing = set()
    assert make_unique_slug("aling-rosa-catering", existing) == "aling-rosa-catering"

def test_make_unique_slug_conflict():
    existing = {"aling-rosa-catering"}
    assert make_unique_slug("aling-rosa-catering", existing) == "aling-rosa-catering-2"

def test_make_unique_slug_multiple_conflicts():
    existing = {"aling-rosa-catering", "aling-rosa-catering-2"}
    assert make_unique_slug("aling-rosa-catering", existing) == "aling-rosa-catering-3"
