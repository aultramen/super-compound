#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Integrity checks for interface-design CSV retrieval assets."""

import csv
import unittest
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parents[1] / "data"


class InterfaceDesignCsvIntegrityTests(unittest.TestCase):
    def test_every_csv_row_matches_its_header_width(self):
        for path in sorted(DATA_DIR.rglob("*.csv")):
            with self.subTest(path=path.relative_to(DATA_DIR)):
                with path.open("r", encoding="utf-8-sig", newline="") as handle:
                    reader = csv.reader(handle)
                    header = next(reader)
                    expected_width = len(header)
                    for line_number, row in enumerate(reader, start=2):
                        self.assertEqual(
                            len(row),
                            expected_width,
                            f"{path}: line {line_number}",
                        )

    def test_product_and_color_catalog_ids_stay_aligned(self):
        def ids(filename):
            with (DATA_DIR / filename).open(
                "r",
                encoding="utf-8-sig",
                newline="",
            ) as handle:
                return [row["No"] for row in csv.DictReader(handle)]

        self.assertEqual(ids("products.csv"), ids("colors.csv"))


if __name__ == "__main__":
    unittest.main()
