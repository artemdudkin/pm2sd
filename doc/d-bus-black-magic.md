1. There are two use cases for non-root users at Linux: (1) run pm2sd as root and start processes as non-root and (2) run pm2sd and managed processes as non-root. This instructions is all about second option (as first option available by default).

2. Do `loginctl enable-linger <user>` from privileged user

3. Add user to group systemd-journal by `usermod -a -G systemd-journal <user>`  from privileged user

4. If you have RHEL or CentOS then you should enable systemd user service for selected user (as Red Hat disabled the systemd user service by default) - please follow [this instruction from SO](https://serverfault.com/a/1026914):

> I've noticed the tableau server uses --user systemd services - they even have a note about this in their docs: https://help.tableau.com/current/server-linux/en-us/systemd_user_service_error.htm
>
> >The systemd user service is not used as commonly as the normal systemd process manager. Red Hat disabled the systemd user service in RHEL 7 (and thereby all distros that come from RHEL, like CentOS, Oracle Linux 7, Amazon Linux 2). However, RedHat has assured Tableau that running the systemd user service is supported as long as the service is re-enabled.
>
> How they do it (example is with a userid 29575)
```
# cat /etc/systemd/system/user@29575.service
[Unit]
Description=User Manager for UID %i
After=systemd-user-sessions.service
# These are present in the RHEL8 version of this file except that the unit is Requires, not Wants.
# It's listed as Wants here so that if this file is used in a RHEL7 settings, it will not fail.
# If a user upgrades from RHEL7 to RHEL8, this unit file will continue to work until it's
# deleted the next time they upgrade Tableau Server itself.
After=user-runtime-dir@%i.service
Wants=user-runtime-dir@%i.service

[Service]
LimitNOFILE=infinity
LimitNPROC=infinity
User=%i
PAMName=systemd-user
Type=notify
# PermissionsStartOnly is deprecated and will be removed in future versions of systemd
# This is required for all systemd versions prior to version 231
PermissionsStartOnly=true
ExecStartPre=/bin/loginctl enable-linger %i
ExecStart=-/lib/systemd/systemd --user
Slice=user-%i.slice
KillMode=mixed
Delegate=yes
TasksMax=infinity
Restart=always
RestartSec=15

[Install]
WantedBy=default.target
```
>
> After you create that file:
>
```
systemctl daemon-reload
systemctl enable user@29575.service
systemctl start user@29575.service
```
