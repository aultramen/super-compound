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

    def test_javafx_quoted_code_cells_round_trip_without_csv_escape_artifacts(self):
        path = DATA_DIR / "stacks" / "javafx.csv"
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            rows = {row["No"]: row for row in csv.DictReader(handle)}

        self.assertEqual(
            rows["8"]["Code Good"],
            'URL view = getClass().getResource("/views/main.fxml"); '
            "Parent root = FXMLLoader.load(view);",
        )
        self.assertEqual(
            rows["9"]["Code Good"],
            'button.getStyleClass().add("primary-action");',
        )
        self.assertEqual(
            rows["20"]["Code Good"],
            'table.setPlaceholder(new Label("No customers match this filter"));',
        )
        self.assertEqual(
            rows["22"]["Code Bad"],
            'label.textProperty().bind(task.messageProperty()); label.setText("Ready");',
        )
        self.assertEqual(
            rows["26"]["Code Good"],
            'nameLabel.setLabelFor(nameField); nameField.setPromptText("Jane Doe");',
        )
        self.assertEqual(
            rows["42"]["Code Bad"],
            'FXMLLoader.load(getClass().getResource("/views/admin.fxml"));',
        )


if __name__ == "__main__":
    unittest.main()
