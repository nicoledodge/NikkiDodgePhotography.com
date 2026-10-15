#!/usr/bin/env bash
set -euo pipefail

# Publish derivatives to the website PVC. This never touches the SFTP archive.
python3 - "${1:-public/assets/images/Portfolio}" <<'PY'
import hashlib, json, os, pathlib, shutil, subprocess, sys, tarfile, tempfile, uuid
source = pathlib.Path(sys.argv[1]).resolve()
if not source.is_dir():
    raise SystemExit('Portfolio source directory does not exist: ' + str(source))
namespace = os.environ.get('NAMESPACE', 'default')
deployment = os.environ.get('APP_NAME', 'nikkidodgephotography')
kubectl = shutil.which('kubectl') or '/usr/local/bin/kubectl'
kubeconfig = os.environ.get('KUBECONFIG', str(pathlib.Path.home() / '.kube/local.yaml'))
command = [kubectl, '--kubeconfig=' + kubeconfig, '-n', namespace, 'exec', '-i', 'deployment/' + deployment, '--']
stage = '/app/data/.portfolio-import-' + uuid.uuid4().hex
files = sorted(p for p in source.rglob('*') if p.is_file() and not p.is_symlink()
               and not any(s.startswith('.') for s in p.relative_to(source).parts))
manifest = []
for path in files:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b''):
            digest.update(chunk)
    manifest.append({'path': path.relative_to(source).as_posix(), 'sha256': digest.hexdigest()})
subprocess.run(command + ['mkdir', '-p', stage], check=True)
try:
    with tempfile.TemporaryDirectory() as directory:
        manifest_path = pathlib.Path(directory) / 'manifest.json'
        manifest_path.write_text(json.dumps(manifest))
        with subprocess.Popen(command + ['tar', 'xf', '-', '-C', stage], stdin=subprocess.PIPE) as child:
            with tarfile.open(fileobj=child.stdin, mode='w|') as archive:
                archive.add(manifest_path, arcname='manifest.json')
                for path in files:
                    archive.add(path, arcname='files/' + path.relative_to(source).as_posix(), recursive=False)
            child.stdin.close()
            if child.wait() != 0:
                raise RuntimeError('Portfolio transfer failed; no files published')
    verify = r'''
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
(async () => {
 const stage = process.argv[1];
 const files = JSON.parse(fs.readFileSync(path.join(stage, 'manifest.json'), 'utf8'));
 for (const entry of files) {
  if (entry.path.split('/').some(part => part === '..' || part === '') || path.isAbsolute(entry.path)) throw Error('Invalid path');
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(path.join(stage, 'files', entry.path))) hash.update(chunk);
  if (hash.digest('hex') !== entry.sha256) throw Error('Checksum failed: ' + entry.path);
 }
 for (const entry of files) {
  const target = path.join('/app/data/media/Portfolio', entry.path);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.renameSync(path.join(stage, 'files', entry.path), target);
 }
 console.log(`Published ${files.length} verified portfolio files; existing unlisted files retained.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
'''
    subprocess.run(command + ['node', '-e', verify, stage], check=True)
finally:
    subprocess.run(command + ['node', '-e', "require('fs').rmSync(process.argv[1],{recursive:true,force:true})", stage], check=True)
PY
