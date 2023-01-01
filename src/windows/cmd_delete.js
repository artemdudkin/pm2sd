const fs = require('fs');
const path = require('path');
const { runScript } = require('../rs');
const cmd_stop = require('./cmd_stop');
const { getLogFolder } = require('./utils.os');
const nssm = path.join(__dirname, './bin/x64/nssm');

async function stop(serviceName, isSilent) {

  await cmd_stop(serviceName, true);

//do not delete logs
//  const folder = path.join(getLogFolder(), serviceName);
//  const fn = path.join(folder, 'service.log');
//  fs.unlinkSync(fn);
//  fs.unlinkSync(folder);

  return runScript(`${nssm} remove ${serviceName} confirm`)
}

module.exports = stop;