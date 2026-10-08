import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('source_archive', Path(__file__).parents[2] / 'scripts/source-archive.py')
archive_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive_module)


class SourceArchiveTests(unittest.TestCase):
    def test_runtime_state_and_traversal_excluded(self):
        for path in ['.env', '.env.local', 'src/.env.example', 'reports/session.sqlite',
                     'src/secrets.key', '../src/a.ts', 'src/../a.ts', '/src/a.ts',
                     'src\\a.ts', 'C:/src/a.ts', 'reports/run.log', 'tests/__pycache__/a.pyc',
                     'frontend/node_modules/a.js', '.DS_Store', 'uploads/a.txt',
                     'reports/sessions/cookies.json', 'tests/sessions/live.sqlite']:
            self.assertFalse(archive_module.allowed(path), path)
        for path in ['.env.example', 'src/api/main.ts', 'reports/T-075-performance-full.json',
                     'tests/release/test_source_archive.py', 'tests/sessions/fixtures.ts',
                     'src/sessions/provider.ts', 'README.md']:
            self.assertTrue(archive_module.allowed(path), path)

    def write_archive(self, root, entries, inventory=None):
        archive = root / 'source.zip'
        with zipfile.ZipFile(archive, 'w') as output:
            for name, content in entries:
                output.writestr(name, content)
            if inventory is not None:
                output.writestr(archive_module.MANIFEST, json.dumps(inventory))
        return archive

    def test_valid_inventory_extracts_and_changed_bytes_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            inventory = {'formatVersion': 1, 'files': [{'path': 'README.md', 'bytes': 2,
                         'sha256': archive_module.digest(b'ok')}]}
            source = self.write_archive(root, [('README.md', b'ok')], inventory)
            self.assertEqual(archive_module.extract(source, root / 'good')['verifiedFiles'], 1)
            self.assertEqual((root / 'good/README.md').read_bytes(), b'ok')
            source.unlink()
            source = self.write_archive(root, [('README.md', b'no')], inventory)
            with self.assertRaises(ValueError):
                archive_module.extract(source, root / 'bad')
            self.assertFalse((root / 'bad').exists())

    def test_forbidden_and_case_collision_rejected_before_writes(self):
        for entries in [[('../escaped.txt', b'no')], [('README.md', b'a'), ('readme.md', b'b')]]:
            with tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                source = self.write_archive(root, entries)
                with self.assertRaises(ValueError):
                    archive_module.extract(source, root / 'bad')
                self.assertFalse((root / 'bad').exists())

    def test_pack_refuses_symlinks_and_detected_private_key_without_archive(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'source'
            (source / 'src').mkdir(parents=True)
            (source / 'src/key.ts').write_bytes(b'-----BEGIN ' + b'PRIVATE KEY-----')
            with self.assertRaisesRegex(ValueError, 'Potential persisted secret'):
                archive_module.pack(source, root / 'bad.zip')
            self.assertFalse((root / 'bad.zip').exists())
            (source / 'src/key.ts').unlink()
            (root / 'target').write_text('outside source')
            (source / 'src/link.ts').symlink_to(root / 'target')
            with self.assertRaisesRegex(ValueError, 'Symlink refused'):
                archive_module.pack(source, root / 'bad.zip')
            self.assertFalse((root / 'bad.zip').exists())

    def test_symlink_archive_member_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'bad.zip'
            with zipfile.ZipFile(source, 'w') as output:
                member = zipfile.ZipInfo('src/link.ts')
                member.create_system = 3
                member.external_attr = (0o120777 << 16)
                output.writestr(member, '../target')
            with self.assertRaises(ValueError):
                archive_module.extract(source, root / 'bad')
            self.assertFalse((root / 'bad').exists())

    def test_nonempty_destination_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = self.write_archive(root, [('README.md', b'ok')], {'formatVersion': 1, 'files': [
                {'path': 'README.md', 'bytes': 2, 'sha256': archive_module.digest(b'ok')}]})
            destination = root / 'existing'
            destination.mkdir()
            (destination / 'keep').write_text('retained')
            with self.assertRaises(ValueError):
                archive_module.extract(source, destination)
            self.assertEqual((destination / 'keep').read_text(), 'retained')


if __name__ == '__main__':
    unittest.main()
