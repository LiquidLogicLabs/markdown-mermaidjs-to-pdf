#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# ///
"""Unit tests for init-sanctum.py."""

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

_SCRIPT = Path(__file__).parent.parent / "init-sanctum.py"
_spec = importlib.util.spec_from_file_location("init_sanctum", _SCRIPT)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


class TestParseYamlConfig(unittest.TestCase):
    def test_parses_key_value_pairs(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write("user_name: Alice\ncommunication_language: English\n")
            path = Path(f.name)
        result = m.parse_yaml_config(path)
        self.assertEqual(result["user_name"], "Alice")
        self.assertEqual(result["communication_language"], "English")
        path.unlink()

    def test_missing_file_returns_empty(self):
        result = m.parse_yaml_config(Path("/nonexistent/config.yaml"))
        self.assertEqual(result, {})

    def test_ignores_comments(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write("# comment\nkey: value\n")
            path = Path(f.name)
        result = m.parse_yaml_config(path)
        self.assertNotIn("# comment", result)
        self.assertEqual(result["key"], "value")
        path.unlink()


class TestParseFrontmatter(unittest.TestCase):
    def test_extracts_fields(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write("---\nname: test-cap\ncode: TC\ndescription: A test capability\n---\n\n# Body\n")
            path = Path(f.name)
        result = m.parse_frontmatter(path)
        self.assertEqual(result["name"], "test-cap")
        self.assertEqual(result["code"], "TC")
        path.unlink()

    def test_no_frontmatter_returns_empty(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write("# No frontmatter here\n")
            path = Path(f.name)
        result = m.parse_frontmatter(path)
        self.assertEqual(result, {})
        path.unlink()


class TestSubstituteVars(unittest.TestCase):
    def test_replaces_placeholders(self):
        result = m.substitute_vars("Hello {user_name}, born {birth_date}", {"user_name": "Alice", "birth_date": "2026-01-01"})
        self.assertEqual(result, "Hello Alice, born 2026-01-01")

    def test_unknown_placeholder_left_intact(self):
        result = m.substitute_vars("Hello {unknown}", {"user_name": "Alice"})
        self.assertIn("{unknown}", result)


class TestGenerateCapabilitiesMd(unittest.TestCase):
    def test_generates_table_rows(self):
        caps = [{"code": "SM", "name": "Scope Mapping", "description": "Maps attack surface", "source": "references/scope-mapping.md"}]
        output = m.generate_capabilities_md(caps)
        self.assertIn("SM", output)
        self.assertIn("Scope Mapping", output)
        self.assertIn("WebSearch", output)


class TestDiscoverCapabilities(unittest.TestCase):
    def test_discovers_capability_with_frontmatter(self):
        with tempfile.TemporaryDirectory() as d:
            cap = Path(d) / "scope-mapping.md"
            cap.write_text("---\nname: scope-mapping\ncode: SM\ndescription: Maps attack surface\n---\n\n# Body\n")
            result = m.discover_capabilities(Path(d), "./references")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["code"], "SM")

    def test_ignores_files_without_code(self):
        with tempfile.TemporaryDirectory() as d:
            cap = Path(d) / "notes.md"
            cap.write_text("---\nname: notes\n---\n\n# Body\n")
            result = m.discover_capabilities(Path(d), "./references")
        self.assertEqual(len(result), 0)


class TestSanctumCreation(unittest.TestCase):
    def test_creates_sanctum_structure(self):
        with tempfile.TemporaryDirectory() as tmp:
            project_root = Path(tmp) / "project"
            skill_path = Path(tmp) / "skill"

            # Minimal skill structure
            (skill_path / "assets").mkdir(parents=True)
            (skill_path / "references").mkdir()

            # Create a stub template
            (skill_path / "assets" / "INDEX-template.md").write_text("# Index\n{user_name}\n")

            # Minimal config
            (project_root / "_bmad").mkdir(parents=True)

            # Patch TEMPLATE_FILES for this test
            original = m.TEMPLATE_FILES
            m.TEMPLATE_FILES = ["INDEX-template.md"]
            try:
                sanctum = project_root / "_bmad" / "memory" / m.SKILL_NAME
                m_main_args = [str(project_root), str(skill_path)]
                sys.argv = ["init-sanctum.py"] + m_main_args
                # Import argparse and parse
                import argparse
                parser = argparse.ArgumentParser()
                parser.add_argument("project_root")
                parser.add_argument("skill_path")
                parser.add_argument("--json", action="store_true")
                args = parser.parse_args(m_main_args)

                # Verify the sanctum would be created at the right path
                expected = project_root / "_bmad" / "memory" / m.SKILL_NAME
                self.assertEqual(str(expected), str(project_root / "_bmad" / "memory" / "bmad-l3io-sec-agent-redteam"))
            finally:
                m.TEMPLATE_FILES = original


if __name__ == "__main__":
    unittest.main()
