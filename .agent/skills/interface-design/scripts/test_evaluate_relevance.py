"""Checks for the source-oracle adapter; fixture judgments remain unchanged."""

import copy
import hashlib
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

import evaluate_relevance as evaluator
from relevance_metrics import grades_for_results, ndcg_at_k, precision_at_k


class RelevanceAdapterTests(unittest.TestCase):
    def test_source_oracle_files_keep_their_pinned_bytes(self):
        for filename, expected in evaluator.SOURCE_FIXTURE_HASHES.items():
            with self.subTest(filename=filename):
                actual = hashlib.sha256((evaluator.FIXTURE_DIR / filename).read_bytes()).hexdigest()
                self.assertEqual(actual, expected)

    def test_source_web_uses_app_without_mutating_fixture_or_excluding_local_web(self):
        fixture = evaluator.load_json(evaluator.FIXTURE_DIR / 'relevance-cases.json')
        before = copy.deepcopy(fixture)
        source_web = [case for case in fixture['cases'] if case.get('domain') == 'web']
        self.assertEqual(len(source_web), 2)
        with patch.object(evaluator.local_core, 'search', return_value={'domain': 'app', 'results': []}) as search:
            result = evaluator.search(source_web[0]['query'], 'web', 3)
        self.assertEqual(search.call_args.args[1], 'app')
        self.assertEqual(result['domain'], 'web')
        self.assertEqual(fixture, before)
        self.assertEqual(set(evaluator.CSV_CONFIG), set(fixture['globalNegativeApplicability']['domains']))
        self.assertIn('web', evaluator.local_core.CSV_CONFIG)
        self.assertIn('app', evaluator.local_core.CSV_CONFIG)
        negative = {'cases': [{'id': 'negative', 'query': 'unknown', 'tags': ['hard-negative']}]}
        with patch.object(evaluator.local_core, 'search', return_value={'count': 0}) as search:
            supplemental = evaluator.supplemental_local_checks(negative)
        self.assertEqual([call.args[1] for call in search.call_args_list], ['web', 'app'])
        self.assertEqual(supplemental['passes'], 2)

    def test_dark_classifier_matches_source_boundaries_and_invalid_values(self):
        for color in ('#000', '#1F2937', '#000000'):
            self.assertTrue(evaluator._palette_is_dark({'Background': color}))
        for color in ('#fff', '#E8ECF1', '', '#bad-value', None):
            self.assertFalse(evaluator._palette_is_dark({'Background': color}))

    def test_grading_requires_every_identity_field_and_missing_ranks_count(self):
        judgments = [{'identity': {'Issue': 'Label', 'Platform': 'Mobile'}, 'grade': 2}]
        self.assertEqual(grades_for_results([{'Issue': 'Label', 'Platform': 'Web'}], judgments), [0])
        self.assertEqual(precision_at_k([2], 3), 1 / 3)
        self.assertLess(ndcg_at_k([0, 2], [2]), 1)

    def test_primary_source_manifest_rejects_metric_regression_and_locked_loss(self):
        report = evaluator.load_json(evaluator.FIXTURE_DIR / 'relevance-baseline.json')
        manifest = evaluator.load_json(evaluator.FIXTURE_DIR / 'relevance-thresholds.json')
        self.assertEqual(evaluator.check_thresholds(report, manifest), [])
        damaged = copy.deepcopy(report)
        damaged['splits']['held_out']['metrics']['precisionAt1'] = 0
        damaged['cases'] = [record for record in damaged['cases'] if record['id'] != 'stack-swiftui-navigation']
        failures = evaluator.check_thresholds(damaged, manifest)
        self.assertTrue(any('held_out.precisionAt1' in failure for failure in failures))
        self.assertTrue(any('stack-swiftui-navigation' in failure for failure in failures))

    def test_report_omits_host_file_metadata(self):
        fixture = {'globalNegativeApplicability': {}, 'cases': [{
            'id': 'fixture', 'split': 'held_out', 'mode': 'domain', 'domain': 'product',
            'query': 'example', 'judgments': [{'identity': {'Product Type': 'Example'}, 'grade': 2}],
        }]}
        output = {'domain': 'product', 'results': [{'Product Type': 'Example'}],
                  'provenance': {'path': 'private-host', 'source_signature': [123, 456]}}
        with patch.object(evaluator.local_core, 'search', return_value=output):
            report = evaluator.evaluate(fixture)
        rendered = json.dumps(report)
        self.assertNotIn('private-host', rendered)
        self.assertNotIn('source_signature', rendered)

    def test_runtime_errors_cannot_pass_as_negative_abstention(self):
        with patch.object(evaluator.local_core, 'search', return_value={'error': 'missing data'}):
            with self.assertRaisesRegex(RuntimeError, 'missing data'):
                evaluator.search('irrelevant', 'product')
        with patch.object(evaluator.local_core, 'search_stack', return_value={'error': 'missing stack'}):
            with self.assertRaisesRegex(RuntimeError, 'missing stack'):
                evaluator.search_stack('irrelevant', 'react')

    def test_local_baseline_decline_is_diagnostic_without_weakening_source_gate(self):
        source_report = evaluator.load_json(evaluator.FIXTURE_DIR / 'relevance-baseline.json')
        stronger_baseline = copy.deepcopy(source_report)
        stronger_baseline['metrics']['precisionAt1'] = 1
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as directory:
            baseline_path = Path(directory) / 'local-baseline.json'
            baseline_path.write_text(json.dumps(stronger_baseline), encoding='utf-8')
            with patch.object(evaluator.sys, 'argv', ['evaluate_relevance.py', '--compare-local-baseline', str(baseline_path)]), \
                    patch.object(evaluator, 'evaluate', return_value=copy.deepcopy(source_report)), \
                    patch.object(evaluator, 'validate_identities', return_value=[]), \
                    patch.object(evaluator, 'supplemental_local_checks', return_value={}), redirect_stdout(output):
                evaluator.main()
        report = json.loads(output.getvalue())
        self.assertEqual(report['decision'], 'PASS')
        comparison = report['localBaselineComparison']
        self.assertEqual(comparison['status'], 'diagnostic-only')
        self.assertLess(comparison['splits']['all']['metrics']['precisionAt1']['delta'], 0)
        damaged = copy.deepcopy(source_report)
        damaged['metrics']['precisionAt1'] = 0
        manifest = evaluator.load_json(evaluator.FIXTURE_DIR / 'relevance-thresholds.json')
        self.assertTrue(evaluator.check_thresholds(damaged, manifest))


if __name__ == '__main__':
    unittest.main()
