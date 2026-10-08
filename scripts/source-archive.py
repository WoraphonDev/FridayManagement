"""Build/verify an isolated candidate source archive; never package runtime state."""
import argparse
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
import stat
import zipfile

ROOT_FILES = {'.env.example', '.gitignore', '.npmrc', '.nvmrc', '.prettierignore',
              '.prettierrc.json', 'package.json', 'package-lock.json', 'eslint.config.mjs',
              'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts',
              'tsconfig.json', 'tsconfig.frontend.json', 'tsconfig.tools.json'}
ROOTS = {'src', 'frontend', 'migrations', 'scripts', 'tests', 'contracts', 'dependencies', 'reports'}
EXCLUDED_PARTS = {'.git', 'node_modules', 'dist', '__pycache__',
                  'test-results', 'playwright-report', '.DS_Store'}
RUNTIME_PARTS = {'uploads', 'logs', 'backups', 'sessions'}
SOURCE_CODE_SUFFIXES = {'.ts', '.tsx', '.js', '.mjs', '.cjs', '.py', '.sql', '.md'}
EXCLUDED_SUFFIXES = {'.log', '.sqlite', '.db', '.bak', '.zip', '.pyc', '.pem', '.key', '.pfx'}
MANIFEST = 'SOURCE_INVENTORY.json'
SECRET_PATTERNS = [rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
                   rb'(?:mssql|sqlserver)://[^\s:@/]+:[^\s@/]+@',
                   rb'Bearer [A-Za-z0-9_.-]{80,}']

MAX_BYTES = 200 * 1024 * 1024


def allowed(name):
    path = PurePosixPath(name)
    if not name or '\\' in name or ':' in name or path.is_absolute() or '..' in path.parts:
        return False
    if str(path) != name or any(part in EXCLUDED_PARTS for part in path.parts):
        return False
    if any(part.startswith('.env') for part in path.parts) and name != '.env.example':
        return False
    if any(part in RUNTIME_PARTS for part in path.parts):
        if path.parts[0] not in {'src', 'frontend', 'tests', 'scripts', 'migrations', 'contracts'} or path.suffix not in SOURCE_CODE_SUFFIXES:
            return False
    if path.suffix.lower() in EXCLUDED_SUFFIXES or name.endswith(('-wal', '-shm')):
        return False
    if len(path.parts) == 1:
        return name in ROOT_FILES or path.suffix in {'.md', '.html'}
    return path.parts[0] in ROOTS


def digest(data):
    return hashlib.sha256(data).hexdigest()


def pack(root, destination):
    root = root.resolve()
    files = {}
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root).as_posix()
        if allowed(relative) and path.is_file():
            if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent != root):
                raise ValueError('Symlink refused: ' + relative)
            data = path.read_bytes()
            if any(re.search(pattern, data) for pattern in SECRET_PATTERNS):
                raise ValueError('Potential persisted secret requires review: ' + relative)
            files[relative] = data
    for required in ('README.md', 'CANDIDATE_RELEASE_NOTES.md', 'package-lock.json', '.env.example',
                     'dependencies/LICENSES.md', 'contracts/openapi.json', 'tests/test-manifest.json'):
        if required not in files:
            raise ValueError('Missing required source: ' + required)
    if sum(map(len, files.values())) > MAX_BYTES:
        raise ValueError('Archive exceeds source size bound')
    inventory = {'formatVersion': 1, 'scope': 'CANDIDATE; native SQL/Windows/UAT NOT_RUN',
                 'files': [{'path': name, 'bytes': len(data), 'sha256': digest(data)}
                           for name, data in files.items()],
                 'exclusions': {'allPaths': sorted(EXCLUDED_PARTS | EXCLUDED_SUFFIXES), 'runtimeDirectories': sorted(RUNTIME_PARTS), 'exception': 'Code modules under approved source roots remain included; persisted state is excluded'},
                 'credentials': 'No persisted credential/session state. Synthetic fixture literals remain in source tests.'}
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)
        archive.writestr(MANIFEST, json.dumps(inventory, ensure_ascii=False, indent=2) + '\n')
    return {'archive': str(destination.resolve()), 'sha256': digest(destination.read_bytes()),
            'sourceFiles': len(files), 'sourceBytes': sum(map(len, files.values())),
            'status': 'CANDIDATE_PENDING_NATIVE_SQL_WINDOWS_UAT'}


def extract(archive_path, destination):
    # Validate the entire archive and every digest before writing even one file.
    with zipfile.ZipFile(archive_path) as archive:
        members = archive.infolist()
        names = [member.filename for member in members]
        if len(names) != len(set(names)) or len(names) != len({name.casefold() for name in names}):
            raise ValueError('Duplicate/case-colliding archive entry')
        if sum(member.file_size for member in members) > MAX_BYTES:
            raise ValueError('Archive exceeds source size bound')
        for member in members:
            if member.filename != MANIFEST and not allowed(member.filename):
                raise ValueError('Forbidden archive entry')
            if member.is_dir() or stat.S_IFMT(member.external_attr >> 16) not in (0, stat.S_IFREG):
                raise ValueError('Non-file archive entry')
        inventory = json.loads(archive.read(MANIFEST))
        expected = inventory['files']
        if inventory['formatVersion'] != 1 or len(expected) != len(names) - 1:
            raise ValueError('Invalid inventory')
        if {item['path'] for item in expected} != set(names) - {MANIFEST}:
            raise ValueError('Inventory entry mismatch')
        payloads = {}
        for item in expected:
            data = archive.read(item['path'])
            if len(data) != item['bytes'] or digest(data) != item['sha256']:
                raise ValueError('Source digest mismatch')
            payloads[item['path']] = data
        payloads[MANIFEST] = archive.read(MANIFEST)
    if destination.is_symlink():
        raise ValueError('Symlink extraction target refused')
    if destination.exists() and any(destination.iterdir()):
        raise ValueError('Extraction target must be empty')
    destination.mkdir(parents=True, exist_ok=True)
    for name, data in payloads.items():
        path = destination / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return {'verifiedFiles': len(expected), 'sha256': digest(archive_path.read_bytes())}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['pack', 'extract'])
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    result = pack(args.source, args.destination) if args.mode == 'pack' else extract(args.source, args.destination)
    print(json.dumps(result))
