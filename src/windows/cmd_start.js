const path = require('path');
const { runScript } = require('../rs');
const nssm = path.join(__dirname, './bin/x64/nssm');

async function stop(serviceName, isSilent) {
  console.log(`Starting service ${serviceName}...`);

  return runScript(`${nssm} start ${serviceName}`)
}

module.exports = stop;