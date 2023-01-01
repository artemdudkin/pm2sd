const path = require('path');
const { runScript } = require('../rs');
const nssm = path.join(__dirname, './bin/x64/nssm');

async function stop(serviceName, isSilent) {
  if (!isSilent) console.log(`Stoping service ${serviceName}...`);

  return runScript(`${nssm} stop ${serviceName}`)
}

module.exports = stop;