import { runInstaller } from './admin.js';
import { InstallerFault } from './authority.js';
import { ApiFault } from '../api/errors.js';
import { OperationError } from '../domain/failure.js';
try {
  await runInstaller(process.argv.slice(2));
} catch (error) {
  const code =
    error instanceof InstallerFault || error instanceof ApiFault || error instanceof OperationError
      ? error.code
      : 'INSTALLER_ACTION_FAILED';
  console.error(
    JSON.stringify({
      status: 'failed',
      code,
      message:
        'ตรวจคำสั่ง สิทธิ์ไฟล์ และหยุด application ก่อนรัน; ห้ามส่งรหัสผ่านผ่าน arguments/log; หากผล commit ไม่แน่นอน ให้ตรวจบัญชีก่อนรันซ้ำ',
    }),
  );
  process.exitCode = 1;
}
