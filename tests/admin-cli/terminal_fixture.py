# Isolated POSIX PTY fixture; credentials arrive via parent stdin, never child argv/env/output.
import os,sys,json,pty,subprocess,select,time,errno
payload=json.load(sys.stdin)
master,slave=pty.openpty()
child=subprocess.Popen(payload['command'],stdin=slave,stdout=slave,stderr=slave,env=payload['env'],close_fds=True)
os.close(slave)
output=b'';sent=0;deadline=time.monotonic()+20
try:
 while time.monotonic()<deadline:
  ready,_,_=select.select([master],[],[],0.05)
  if ready:
   try: block=os.read(master,65536)
   except OSError as e:
    if e.errno==errno.EIO: break
    raise
   if not block: break
   output+=block
   text=output.decode('utf8','replace')
   prompts=['New temporary password (6–128 characters): ','Confirm temporary password: ']
   if sent<len(payload['inputs']) and prompts[sent] in text:
    os.write(master,payload['inputs'][sent].encode('utf8')+b'\r');sent+=1
  if child.poll() is not None: break
 else:
  child.kill();raise RuntimeError('PTY fixture timeout')
 child.wait(timeout=2)
 for secret in payload['inputs']:
  if secret and secret.encode('utf8') in output: raise RuntimeError('hidden terminal echoed a credential')
 print(json.dumps({'code':child.returncode,'sent':sent,'output':output.decode('utf8','replace')}))
finally:
 if child.poll() is None: child.kill();child.wait()
 os.close(master)
