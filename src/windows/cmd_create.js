const path = require('path');
const fs = require('fs');
const { runScript } = require('../rs');
const { getServiceList, getNodePath, getLogFolder } = require('./utils.os');
const nssm = path.join(__dirname, './bin/x64/nssm');


/**
 * @param {String} fn
 * @param {Object} opt {name, user, description, time}
 */
async function create(fn, opt) {
  if (!opt.user) opt.user = "LocalSystem";

  let res = await getServiceList()
  if (res.indexOf(opt.name) !== -1) {
    throw new Error(`Service ${opt.name} already exists`);
  }

  if (!fs.existsSync(fn)) {
    throw new Error(`File '${fn}' does not exists`);
  }

  let nodePath;
  if (fn.endsWith('.js')) {
    nodePath = await getNodePath();
    if (!nodePath) throw new Error(`Cannot find node.js installation path`);
  }

  if (fn.endsWith('.js')) {
    await runScript(`${nssm} install ${opt.name} ${nodePath} ${path.resolve(fn)}`)
  } else {
    await runScript(`${nssm} install ${opt.name} ${path.resolve(fn)}`)
  }

  await runScript(`${nssm} set ${opt.name} AppDirectory ${process.cwd()}`)

  await runScript(`${nssm} set ${opt.name} DisplayName ${opt.name}`);
  if (opt.description) await runScript(`${nssm} set ${opt.name} Description ${opt.description}`);
  await runScript(`${nssm} set ${opt.name} Start SERVICE_AUTO_START`);

  await runScript(`${nssm} set ${opt.name} ObjectName ${opt.user}`);
  await runScript(`${nssm} set ${opt.name} Type SERVICE_WIN32_OWN_PROCESS`);

  await runScript(`${nssm} set ${opt.name} AppPriority NORMAL_PRIORITY_CLASS`);
  await runScript(`${nssm} set ${opt.name} AppNoConsole 0`);
  await runScript(`${nssm} set ${opt.name} AppAffinity All`);
  //logs
  //TODO logs for non-privileged user
  //TODO what if opt.name is not ok and folder creation failed (it includes opt.name)
  let logFolder = getLogFolder();
  if (!fs.existsSync(logFolder)) fs.mkdirSync(logFolder, 0744);
  logFolder = path.join(logFolder, opt.name);
  if (!fs.existsSync(logFolder)) fs.mkdirSync(logFolder, 0744);
  let logFn = path.join(logFolder, 'service.log');
  await runScript(`${nssm} set ${opt.name} AppStdout ${logFn}`);
  await runScript(`${nssm} set ${opt.name} AppStderr ${logFn}`);
  await runScript(`${nssm} set ${opt.name} AppRotateFiles 1`);
  await runScript(`${nssm} set ${opt.name} AppRotateOnline 1`);
  await runScript(`${nssm} set ${opt.name} AppRotateSeconds 86400`);
  await runScript(`${nssm} set ${opt.name} AppRotateBytes 1048576`);
}


module.exports = create;