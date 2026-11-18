const { spawn } = require('child_process');
const mode = process.argv[2] === 'admin' ? 'admin' : 'user';
const child = spawn(process.execPath, [require.resolve('react-app-rewired/bin/index.js'), 'start'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: mode === 'admin' ? '3001' : '3000', REACT_APP_APP_MODE: mode, BROWSER: 'none' },
});
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (error) => { console.error(error.message); process.exit(1); });
