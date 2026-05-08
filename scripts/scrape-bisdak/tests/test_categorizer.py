import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from categorizer import categorize

def test_food_dining():
    assert categorize("Aling Rosa Catering", None) == "food-dining"

def test_beauty():
    assert categorize("Maria's Nails and Spa", None) == "beauty-personal-care"

def test_remittance():
    assert categorize("Pinoy Padala Services", None) == "remittance-travel"

def test_retail():
    assert categorize("Pinoy Grocery Store", None) == "retail-groceries"

def test_trades():
    assert categorize("Filipino Cleaning Services Auckland", None) == "trades-home-services"

def test_health():
    assert categorize("Pinoy Dental Clinic", None) == "health-wellness"

def test_community():
    assert categorize("Auckland Filipino Community Church", None) == "community-events"

def test_professional_services():
    assert categorize("Pinoy Tax Accountant", None) == "professional-services"

def test_fallback_to_professional_services():
    assert categorize("Agila Enterprises", None) == "professional-services"

def test_description_used_when_name_sparse():
    assert categorize("AP Enterprises", "Filipino restaurant and catering") == "food-dining"

def test_case_insensitive():
    assert categorize("LECHON KING NZ", None) == "food-dining"
