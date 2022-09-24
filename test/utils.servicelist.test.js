const proxyquire = require("proxyquire");
const { expect } = require("chai");

const ret_1 = `UNIT FILE                              STATE           VENDOR PRESET
accounts-daemon.service                enabled         enabled      
apparmor.service                       enabled         enabled      
apt-daily-upgrade.service              static          enabled      
EXIT 0`;


describe("#utils.servicelist", function () {

  it("[linux] getCurrentUser", function () {
    const { getCurrentUser } = proxyquire("../utils.servicelist", {
      "./rs": {runScript : (cmd) => Promise.resolve( {lines: ['xyz\nEXIT 0']})},
    });

    return getCurrentUser()
    .then(res => {
      expect(res).to.equal('xyz')
    })
  });


  it("[linux] getServiceList", function () {
    let commands = []
    const { getServiceList } = proxyquire("../utils.servicelist", {
      "./rs": {runScript : (cmd) => {
          commands.push(cmd);
          return Promise.resolve( {lines: [(cmd==='whoami'?'root':ret_1)]})
        }
      },
    });

    return getServiceList()
    .then(res => {
      expect(commands).to.deep.equal(['whoami', 'systemctl  list-unit-files --type=service'])
      expect(res).to.deep.equal(['accounts-daemon.service', 'apparmor.service'])
    })
  });


  it("[linux] getServiceList with filter", function () {
    const { getServiceList } = proxyquire("../utils.servicelist", {
      "./rs": {runScript : (cmd) => Promise.resolve( {lines: [(cmd==='whoami'?'root':ret_1)]})},
    });

    return getServiceList('account')
    .then(res => {
      expect(res).to.deep.equal(['accounts-daemon.service'])
    })
  });


  it("[linux] getServiceList (non-root)", function () {
    let commands = []
    const { getServiceList } = proxyquire("../utils.servicelist", {
      "./rs": {runScript : (cmd) => {
          commands.push(cmd);
          return Promise.resolve( {lines: [(cmd==='whoami'?'xyz':ret_1)]})
        }
      },
    });

    return getServiceList()
    .then(res => {
      expect(commands).to.deep.equal(['whoami', 'systemctl --user list-unit-files --type=service'])
    })
  });


});