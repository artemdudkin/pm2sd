const proxyquire = require("proxyquire");
const { expect } = require("chai");

const ret_abc = `● pm2sd-a.service - PM2SD pm2sd-a
   Loaded: loaded (/etc/systemd/system/pm2sd-a.service; enabled; vendor preset: disabled)
   Active: active (running) since Sat 2022-09-24 17:34:50 MSK; 2s ago
  Process: 1141 ExecStart=/bin/bash /usr/sbin/pm2sd-a.service.sh (code=exited, status=0/SUCCESS)
 Main PID: 25107 (code=killed, signal=TERM)
   CGroup: /system.slice/pm2sd-a.service
           ├─1142 /bin/bash /usr/sbin/pm2sd-a.sh
           ├─1143 /bin/bash /usr/sbin/pm2sd-a.service.sh
           ├─1144 tee -a /var/log/pm2sd-a/output.log
           └─1145 sleep 3

Sep 24 17:34:50 vds2326517.my-ihor.ru systemd[1]: pm2sd-a.service holdoff time over, scheduling restart.
Sep 24 17:34:50 vds2326517.my-ihor.ru systemd[1]: Stopped PM2SD pm2sd-a.
Sep 24 17:34:50 vds2326517.my-ihor.ru systemd[1]: Starting PM2SD pm2sd-a...
Sep 24 17:34:50 vds2326517.my-ihor.ru systemd[1]: Started PM2SD pm2sd-a.
EXOT 0`;

const ret_xyz = '* xyz-vpn.service - XYZ VPN\n'+
'     Loaded: loaded (/etc/systemd/system/xyz-vpn.service; enabled; vendor preset: enabled)\n'+
'     Active: active (running) since Sat 2022-09-24 12:55:56 MSK; 4h 11min ago\n'+
'    Process: 77630 ExecStart=/bin/bash /usr/sbin/openconnect.start.sh (code=exited, status=0/SUCCESS)\n'+
'      Tasks: 1 (limit: 1102)\n'+
'     Memory: 2.7M\n'+
'     CGroup: /system.slice/xyz-vpn.service\n'+
'             `-77636 openconnect vpn.xyz.com\n'+
'\n'+
'Sep 24 12:55:56 vds2318343 systemd[1]: Starting NLMK VPN...\n'+
'Sep 24 12:55:56 vds2318343 systemd[1]: Started NLMK VPN.\n'+
'EXIT 0\n';

const ret_aaa = `● auditd.service - Security Auditing Service
   Loaded: loaded (/usr/lib/systemd/system/auditd.service; enabled; vendor preset: enabled)
   Active: active (running) since Sun 2022-09-11 01:37:00 MSK; 1 weeks 6 days ago
     Docs: man:auditd(8)
           https://github.com/linux-audit/audit-documentation
 Main PID: 422 (auditd)
   Memory: 1.7M
   CGroup: /system.slice/auditd.service
           └─422 /sbin/auditd

Sep 22 18:15:36 vds2326517.my-ihor.ru auditd[422]: Audit daemon rotating log files
Warning: Journal has been rotated since unit was started. Log output is incomplete or unavailable.
EXIT 0`;

const ret_ps = `%CPU   RSS USER         PID
 0.1  1356 root      1142
 0.2   860 root      1143
 0.3   664 root      1144
 0.5  9660 root       77636
EXIT 0`;


describe("#cmd_ls", function () {

  it("[linux] ls", function () {
    let commands = []
    let printLsResult;
    const ls = proxyquire("../cmd_ls", {
      './rs': {
        runScript : (cmd) => {
          commands.push(cmd);
          if (cmd.endsWith('abc')) {
            return Promise.resolve( {lines: [ret_abc]})
          } else if (cmd.endsWith('xyz')) {
            return Promise.resolve( {lines: [ret_xyz]})
          } else if (cmd.endsWith('aaa')) {
            return Promise.resolve( {lines: [ret_aaa]})
          } else {
            return Promise.resolve( {lines: [ret_ps]})
          }
        }
      },
      './utils': {
         loader: {on:()=>{}, off:()=>{}},
         printLs: (res) => {printLsResult=res},
         getCurrentUser: () => 'root',
         getServiceList: () => ['abc', 'xyz', 'aaa'],
       }
    });

    return ls()
    .then(res => {
      expect(commands).to.deep.equal([
        'systemctl  status abc',
        'systemctl  status xyz', 
        'systemctl  status aaa', 
        'ps -p 25107,422,1142,1143,1144,1145,77636 -o %cpu -o rss -o user -o pid'
      ])
      expect(printLsResult).to.deep.equal([{
          "Loaded": "loaded (/etc/systemd/system/pm2sd-a.service; enabled; vendor preset: disabled)",
          "active": "active",
          "children": ["1142","1143","1144","1145"],
          "cpu": 0.6000000000000001,
          "description": "PM2SD pm2sd-a",
          "enabled": "enabled",
          "memory": "2.9mb",
          "name": "pm2sd-a",
          "pid": "25107",
          "uptime": "2s",
          "user": "root"
        },
        {
          "Loaded": "loaded (/etc/systemd/system/xyz-vpn.service; enabled; vendor preset: enabled)",
          "active": "active",
          "children": ['77636'],
          "cpu": 0.5,
          "description": "XYZ VPN",
          "enabled": "enabled",
          "memory": "9.7mb",
          "name": "xyz-vpn",
          "pid": "",
          "uptime": "4h 11min",
          "user": "root",
        },
        {
          "Loaded": "loaded (/usr/lib/systemd/system/auditd.service; enabled; vendor preset: enabled)",
          "active": "active",
          "children": ["422"],
          "cpu": 0,
          "description": "Security Auditing Service",
          "enabled": "enabled",
          "memory": "1.7M",
          "name": "auditd",
          "pid": "422",
          "uptime": "1 weeks 6 days",
          "user": "",
        }])
    })
  });
});