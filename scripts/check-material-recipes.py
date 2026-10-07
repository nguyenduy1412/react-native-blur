"""Checks the Android material table against Apple's own numbers.

Two independent checks:

1. The recipe-backed half of the Kotlin table equals the `.materialrecipe`
   files shipped in the iOS simulator runtime (skipped when no runtime is
   mounted). The legacy `_UIBackdropView` styles have no recipe file, so they
   are only covered by check 2.
2. The Kotlin pipeline reproduces what iOS actually renders. The expected
   colours below were sampled from screenshots of UIVisualEffectView on a
   booted iPhone 16 Pro / iOS 27 simulator, one flat background colour per
   screenshot so the blur cannot bleed.

The two families do not share a pipeline. CoreMaterial fuses saturation and
the luminance plate into one filter; the legacy styles run them as separate
CALayer filter stages, so the saturated colour is clamped to 8 bit before the
plate is blended. That clamp is what keeps a saturated green readable instead
of crushing a channel to zero, hence `clampsBetweenStages`.

Known ceiling: Apple maps backdrop luminance through a 4-stop curve, the
Kotlin side flattens it to its least-squares line so a material fits in one
ColorMatrix (works on API 31, no RuntimeShader). That costs ~2/255 on average
and ~23/255 on chrome, whose curve has a spike at 1/3. Upgrade path if chrome
ever matters: RuntimeShader with the 4 stops on API 33+.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

KOTLIN = Path(__file__).resolve().parents[1] / "android/src/main/java/com/nguyenduy/blur/BlurView.kt"

RECIPE_FILES = {
    ("LIGHT", "ultrathin"): "platformContentUltraThinLight",
    ("LIGHT", "thin"): "platformContentThinLight",
    ("LIGHT", "regular"): "platformContentLight",
    ("LIGHT", "thick"): "platformContentThickLight",
    ("LIGHT", "chrome"): "platformChromeLight",
    ("DARK", "ultrathin"): "platformContentUltraThinDark",
    ("DARK", "thin"): "platformContentThinDark",
    ("DARK", "regular"): "platformContentDark",
    ("DARK", "thick"): "platformContentThickDark",
    ("DARK", "chrome"): "platformChromeDark",
}

MEASURED_RECIPES = {
    "black": {"bg": [0.0, 0.0, 0.0], "LIGHT": {"ultrathin": [88.7, 88.7, 88.7], "thin": [141.1, 141.2, 141.2], "regular": [196.1, 197.9, 196.1], "thick": [234.0, 234.0, 234.0], "chrome": [178.0, 179.2, 178.0]}, "DARK": {"ultrathin": [31.8, 31.8, 31.8], "thin": [32.0, 32.0, 32.0], "regular": [31.8, 31.8, 31.8], "thick": [30.0, 30.0, 30.0], "chrome": [18.0, 19.2, 19.1]}},
    "white": {"bg": [255.0, 255.0, 255.0], "LIGHT": {"ultrathin": [245.0, 245.0, 245.0], "thin": [245.1, 245.1, 245.2], "regular": [244.8, 245.0, 244.9], "thick": [246.0, 246.0, 246.0], "chrome": [247.0, 247.6, 247.0]}, "DARK": {"ultrathin": [176.8, 176.8, 176.8], "thin": [125.8, 125.8, 125.8], "regular": [84.0, 84.0, 84.0], "thick": [36.0, 36.0, 36.0], "chrome": [87.8, 87.9, 87.8]}},
    "gray50": {"bg": [128.0, 128.0, 128.0], "LIGHT": {"ultrathin": [169.3, 169.3, 169.3], "thin": [200.3, 200.4, 200.3], "regular": [222.2, 223.9, 222.2], "thick": [243.0, 243.0, 243.0], "chrome": [239.6, 239.6, 239.6]}, "DARK": {"ultrathin": [100.0, 100.0, 100.0], "thin": [76.0, 76.0, 76.0], "regular": [63.8, 63.8, 63.8], "thick": [42.0, 42.0, 42.0], "chrome": [74.8, 75.2, 74.8]}},
    "gray25": {"bg": [64.0, 64.0, 64.0], "LIGHT": {"ultrathin": [130.0, 130.0, 130.0], "thin": [175.1, 175.2, 175.2], "regular": [207.9, 208.0, 208.0], "thick": [237.0, 237.0, 237.0], "chrome": [210.2, 211.0, 210.1]}, "DARK": {"ultrathin": [63.4, 63.4, 63.4], "thin": [55.8, 55.9, 55.9], "regular": [53.8, 53.8, 53.8], "thick": [39.0, 39.0, 39.0], "chrome": [58.1, 59.9, 58.2]}},
    "gray75": {"bg": [191.0, 191.0, 191.0], "LIGHT": {"ultrathin": [209.3, 209.3, 209.3], "thin": [222.2, 222.2, 222.2], "regular": [237.1, 238.9, 237.1], "thick": [246.0, 246.0, 246.0], "chrome": [254.9, 254.9, 254.9]}, "DARK": {"ultrathin": [137.8, 137.8, 137.8], "thin": [98.1, 98.1, 98.1], "regular": [71.8, 71.8, 71.8], "thick": [42.0, 42.0, 42.0], "chrome": [79.8, 80.2, 79.8]}},
    "red": {"bg": [255.0, 0.0, 0.0], "LIGHT": {"ultrathin": [234.0, 93.0, 93.0], "thin": [254.9, 141.2, 141.2], "regular": [254.9, 185.8, 185.8], "thick": [254.9, 225.9, 225.9], "chrome": [254.9, 190.6, 190.6]}, "DARK": {"ultrathin": [168.8, 29.0, 29.0], "thin": [159.1, 21.9, 21.9], "regular": [126.0, 30.2, 30.3], "thick": [75.4, 30.0, 30.0], "chrome": [156.1, 28.0, 28.0]}},
    "green": {"bg": [0.0, 255.0, 0.0], "LIGHT": {"ultrathin": [101.6, 244.0, 101.6], "thin": [120.1, 254.9, 120.2], "regular": [167.0, 254.9, 167.0], "thick": [213.9, 254.9, 213.9], "chrome": [203.6, 254.9, 203.6]}, "DARK": {"ultrathin": [32.0, 172.6, 32.0], "thin": [0.1, 133.0, 0.1], "regular": [2.0, 97.6, 2.0], "thick": [9.0, 54.5, 9.0], "chrome": [0.1, 114.0, 0.1]}},
    "blue": {"bg": [0.0, 0.0, 255.0], "LIGHT": {"ultrathin": [90.0, 90.0, 230.3], "thin": [141.1, 141.2, 254.9], "regular": [192.1, 192.1, 254.9], "thick": [231.0, 231.0, 254.9], "chrome": [182.2, 182.2, 252.6]}, "DARK": {"ultrathin": [30.2, 30.3, 169.0], "thin": [27.8, 27.9, 165.1], "regular": [32.2, 32.2, 128.3], "thick": [30.0, 30.0, 77.1], "chrome": [24.1, 24.2, 152.6]}},
    "warm": {"bg": [200.0, 120.0, 60.0], "LIGHT": {"ultrathin": [210.7, 166.3, 133.0], "thin": [239.1, 195.8, 163.2], "regular": [251.0, 220.1, 197.9], "thick": [254.9, 240.9, 231.0], "chrome": [254.9, 238.2, 221.6]}, "DARK": {"ultrathin": [139.0, 95.0, 61.8], "thin": [114.0, 70.0, 38.0], "regular": [90.0, 59.8, 37.8], "thick": [54.4, 39.0, 30.0], "chrome": [108.9, 69.7, 39.0]}},
    "teal": {"bg": [60.0, 140.0, 160.0], "LIGHT": {"ultrathin": [131.3, 176.0, 187.3], "thin": [165.1, 208.0, 218.2], "regular": [198.1, 228.0, 236.9], "thick": [231.0, 243.9, 249.0], "chrome": [221.6, 243.2, 247.6]}, "DARK": {"ultrathin": [63.0, 107.8, 118.8], "thin": [40.0, 83.8, 94.1], "regular": [39.8, 69.8, 75.8], "thick": [30.0, 45.5, 48.4], "chrome": [42.1, 82.8, 92.8]}},
    "pastel": {"bg": [180.0, 150.0, 140.0], "LIGHT": {"ultrathin": [201.3, 184.0, 179.3], "thin": [222.5, 208.0, 202.0], "regular": [240.8, 228.0, 224.2], "thick": [249.0, 243.0, 243.0], "chrome": [254.9, 247.0, 244.6]}, "DARK": {"ultrathin": [128.2, 112.3, 107.8], "thin": [98.1, 82.0, 78.0], "regular": [75.8, 65.8, 61.8], "thick": [48.4, 42.0, 39.0], "chrome": [90.8, 74.7, 69.9]}},
}

MEASURED_LEGACY = {
    "black": {"bg": [0.0, 0.0, 0.0], **{"LEGACY_LIGHT": [77.0, 77.0, 77.0], "LEGACY_EXTRA_LIGHT": [198.0, 198.0, 198.0], "LEGACY_DARK": [20.0, 20.0, 20.0], "regularLight": [77.0, 77.0, 77.0], "prominentLight": [198.0, 198.0, 198.0], "regularDark": [20.0, 20.0, 20.0], "prominentDark": [20.0, 20.0, 20.0]}},
    "white": {"bg": [255.0, 255.0, 255.0], **{"LEGACY_LIGHT": [255.0, 255.0, 255.0], "LEGACY_EXTRA_LIGHT": [249.0, 249.0, 249.0], "LEGACY_DARK": [89.0, 89.0, 89.0], "regularLight": [255.0, 255.0, 255.0], "prominentLight": [249.0, 249.0, 249.0], "regularDark": [89.0, 89.0, 89.0], "prominentDark": [89.0, 89.0, 89.0]}},
    "gray50": {"bg": [128.0, 128.0, 128.0], **{"LEGACY_LIGHT": [167.0, 167.0, 167.0], "LEGACY_EXTRA_LIGHT": [223.0, 223.0, 223.0], "LEGACY_DARK": [55.0, 55.0, 55.0], "regularLight": [166.0, 166.0, 166.0], "prominentLight": [223.0, 223.0, 223.0], "regularDark": [55.0, 55.0, 55.0], "prominentDark": [55.0, 55.0, 55.0]}},
    "gray25": {"bg": [64.0, 64.0, 64.0], **{"LEGACY_LIGHT": [121.0, 121.0, 121.0], "LEGACY_EXTRA_LIGHT": [211.0, 211.0, 211.0], "LEGACY_DARK": [38.0, 38.0, 38.0], "regularLight": [121.0, 121.0, 121.0], "prominentLight": [211.0, 211.0, 211.0], "regularDark": [38.0, 38.0, 38.0], "prominentDark": [38.0, 38.0, 38.0]}},
    "gray75": {"bg": [191.0, 191.0, 191.0], **{"LEGACY_LIGHT": [210.0, 210.0, 210.0], "LEGACY_EXTRA_LIGHT": [236.0, 236.0, 236.0], "LEGACY_DARK": [72.0, 72.0, 72.0], "regularLight": [210.0, 210.0, 210.0], "prominentLight": [236.0, 236.0, 236.0], "regularDark": [72.0, 72.0, 72.0], "prominentDark": [72.0, 72.0, 72.0]}},
    "red": {"bg": [255.0, 0.0, 0.0], **{"LEGACY_LIGHT": [255.0, 77.0, 77.0], "LEGACY_EXTRA_LIGHT": [249.0, 198.0, 198.0], "LEGACY_DARK": [89.0, 20.0, 20.0], "regularLight": [255.0, 77.0, 77.0], "prominentLight": [249.0, 198.0, 198.0], "regularDark": [89.0, 20.0, 20.0], "prominentDark": [89.0, 20.0, 20.0]}},
    "green": {"bg": [0.0, 255.0, 0.0], **{"LEGACY_LIGHT": [77.0, 255.0, 77.0], "LEGACY_EXTRA_LIGHT": [198.0, 249.0, 198.0], "LEGACY_DARK": [20.0, 89.0, 20.0], "regularLight": [77.0, 255.0, 77.0], "prominentLight": [198.0, 249.0, 198.0], "regularDark": [20.0, 89.0, 20.0], "prominentDark": [20.0, 89.0, 20.0]}},
    "blue": {"bg": [0.0, 0.0, 255.0], **{"LEGACY_LIGHT": [77.0, 77.0, 255.0], "LEGACY_EXTRA_LIGHT": [198.0, 198.0, 249.0], "LEGACY_DARK": [20.0, 20.0, 89.0], "regularLight": [77.0, 77.0, 255.0], "prominentLight": [198.0, 198.0, 249.0], "regularDark": [20.0, 20.0, 89.0], "prominentDark": [20.0, 20.0, 89.0]}},
    "warm": {"bg": [200.0, 120.0, 60.0], **{"LEGACY_LIGHT": [254.8, 154.0, 78.9], "LEGACY_EXTRA_LIGHT": [249.0, 220.0, 198.0], "LEGACY_DARK": [89.0, 50.0, 21.0], "regularLight": [255.0, 154.0, 78.0], "prominentLight": [249.0, 220.0, 198.0], "regularDark": [89.0, 50.0, 21.0], "prominentDark": [89.0, 50.0, 21.0]}},
    "teal": {"bg": [60.0, 140.0, 160.0], **{"LEGACY_LIGHT": [83.3, 183.0, 208.0], "LEGACY_EXTRA_LIGHT": [199.0, 228.0, 235.0], "LEGACY_DARK": [23.0, 62.0, 72.0], "regularLight": [82.0, 183.0, 209.2], "prominentLight": [199.0, 228.0, 235.0], "regularDark": [23.0, 61.0, 72.0], "prominentDark": [23.0, 62.0, 71.0]}},
    "pastel": {"bg": [180.0, 150.0, 140.0], **{"LEGACY_LIGHT": [217.0, 178.0, 165.0], "LEGACY_EXTRA_LIGHT": [237.0, 227.0, 223.0], "LEGACY_DARK": [74.0, 60.0, 55.0], "regularLight": [216.0, 178.0, 165.0], "prominentLight": [237.0, 227.0, 223.0], "regularDark": [74.0, 60.0, 55.0], "prominentDark": [74.0, 60.0, 55.0]}},
}

ADAPTIVE = {
    "regularLight": "LEGACY_LIGHT",
    "prominentLight": "LEGACY_EXTRA_LIGHT",
    "regularDark": "LEGACY_DARK",
    "prominentDark": "LEGACY_DARK",
}

LUMA = (0.213, 0.715, 0.072)
MEAN_TOLERANCE = 2.5
WORST_TOLERANCE = 24.0

failures = []


def parse_material(fields, values):
    numbers = [float(f.strip().rstrip("f")) for f in fields.split(",")]
    return {
        "blurRadius": numbers[0],
        "saturation": numbers[1],
        "brightness": numbers[2],
        "luminanceAmount": numbers[3],
        "luminanceValues": [float(v.strip().rstrip("f")) for v in values.split(",")],
    }


def parse_kotlin_table():
    source = KOTLIN.read_text()
    tables = {}
    for tone in ("LIGHT", "DARK"):
        block = re.search(rf"private val {tone}_MATERIALS = mapOf\((.*?)\n\)", source, re.S).group(1)
        tables[tone] = {
            name: parse_material(fields, values)
            for name, fields, values in re.findall(
                r'"(\w+)" to Material\(([-\d.f, ]+), floatArrayOf\(([^)]+)\)\)', block
            )
        }
    tables["LEGACY"] = {
        name: parse_material(fields, values)
        for name, fields, values in re.findall(
            r"private val (LEGACY_\w+) = Material\(([-\d.f, ]+), floatArrayOf\(([^)]+)\)", source
        )
    }
    return tables


def core_material_dir():
    runtimes = json.loads(subprocess.run(
        ["xcrun", "simctl", "runtime", "list", "-j"], capture_output=True, text=True, check=True
    ).stdout)
    newest = max(runtimes.values(), key=lambda r: r.get("version", "0"))
    root = Path(newest["runtimeBundlePath"]) / "Contents/Resources/RuntimeRoot"
    return root / "System/Library/PrivateFrameworks/CoreMaterial.framework"


def check_against_runtime(tables):
    try:
        folder = core_material_dir()
    except Exception as error:
        print(f"skip: no simulator runtime to compare against ({error})")
        return
    if not folder.is_dir():
        print(f"skip: {folder} not mounted")
        return
    for (tone, name), recipe_name in RECIPE_FILES.items():
        path = folder / f"{recipe_name}.materialrecipe"
        if not path.exists():
            failures.append(f"{recipe_name}.materialrecipe is gone")
            continue
        recipe = json.loads(subprocess.run(
            ["plutil", "-convert", "json", "-o", "-", str(path)], capture_output=True, text=True, check=True
        ).stdout)["baseMaterial"]["materialFiltering"]
        ours = tables[tone][name]
        for key in ("blurRadius", "saturation", "brightness", "luminanceAmount"):
            if abs(recipe.get(key, 0.0) - ours[key]) > 1e-6:
                failures.append(f"{tone}/{name}.{key}: kotlin {ours[key]} vs recipe {recipe.get(key)}")
        if [round(v, 6) for v in recipe["luminanceValues"]] != [round(v, 6) for v in ours["luminanceValues"]]:
            failures.append(f"{tone}/{name}.luminanceValues: kotlin {ours['luminanceValues']} vs recipe {recipe['luminanceValues']}")
    print(f"ok: recipe-backed materials match {folder.name}")


def plate_line(values):
    if len(values) < 2:
        return 0.0, values[0]
    mean = sum(values) / len(values)
    offsets = [i / (len(values) - 1) - 0.5 for i in range(len(values))]
    slope = sum(o * (v - mean) for o, v in zip(offsets, values)) / sum(o * o for o in offsets)
    return slope, mean - slope * 0.5


def predict(background, material, clamps_between_stages):
    slope, intercept = plate_line(material["luminanceValues"])
    amount = material["luminanceAmount"]
    luma = sum(k * c for k, c in zip(LUMA, background))
    saturated = [luma + material["saturation"] * (c - luma) for c in background]
    if clamps_between_stages:
        saturated = [min(255.0, max(0.0, c)) for c in saturated]
    plate = amount * (slope * luma + intercept * 255.0)
    offset = material["brightness"] * 255.0
    return [min(255.0, max(0.0, (1 - amount) * c + plate + offset)) for c in saturated]


def check_against_ios(tables):
    errors = []
    worst = (0.0, None)
    samples = []
    for bg_name, sample in MEASURED_RECIPES.items():
        for tone in ("LIGHT", "DARK"):
            for name, measured in sample[tone].items():
                samples.append((f"{bg_name}/{tone}/{name}", sample["bg"], tables[tone][name], False, measured))
    for bg_name, sample in MEASURED_LEGACY.items():
        for name, measured in sample.items():
            if name == "bg":
                continue
            key = ADAPTIVE.get(name, name)
            samples.append((f"{bg_name}/{name}", sample["bg"], tables["LEGACY"][key], True, measured))
    for label, background, material, staged, measured in samples:
        predicted = predict(background, material, staged)
        error = max(abs(p - m) for p, m in zip(predicted, measured))
        errors.append(error)
        if error > worst[0]:
            worst = (error, f"{label} predicted {[round(p) for p in predicted]} vs iOS {measured}")
    mean = sum(errors) / len(errors)
    if mean > MEAN_TOLERANCE:
        failures.append(f"mean error {mean:.2f}/255 exceeds {MEAN_TOLERANCE}")
    if worst[0] > WORST_TOLERANCE:
        failures.append(f"worst error {worst[0]:.1f}/255 exceeds {WORST_TOLERANCE} at {worst[1]}")
    print(f"ok: {len(errors)} samples, mean {mean:.2f}/255, worst {worst[0]:.1f}/255 at {worst[1]}")


tables = parse_kotlin_table()
missing = [key for key in RECIPE_FILES if key[1] not in tables[key[0]]]
missing += [name for name in set(ADAPTIVE.values()) if name not in tables["LEGACY"]]
if missing:
    failures.append(f"kotlin table is missing {missing}")
else:
    check_against_runtime(tables)
    check_against_ios(tables)

if failures:
    for failure in failures:
        print(f"FAIL: {failure}")
    sys.exit(1)
print("ok: android materials track iOS")
