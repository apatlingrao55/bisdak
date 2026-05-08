import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from regions import map_region

def test_auckland():
    assert map_region("Otahuhu, Auckland") == "auckland"

def test_auckland_suburb():
    assert map_region("Manukau") == "auckland"

def test_wellington():
    assert map_region("Lower Hutt, Wellington") == "wellington"

def test_christchurch():
    assert map_region("Christchurch") == "canterbury"

def test_hamilton():
    assert map_region("Hamilton, Waikato") == "waikato"

def test_tauranga():
    assert map_region("Tauranga") == "bay-of-plenty"

def test_rotorua():
    assert map_region("Rotorua") == "bay-of-plenty"

def test_unknown_returns_none():
    assert map_region("Invercargill") is None

def test_none_input_returns_none():
    assert map_region(None) is None

def test_case_insensitive():
    assert map_region("AUCKLAND CBD") == "auckland"
