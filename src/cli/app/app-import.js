import fs from 'fs';
import { Command, Option } from 'commander';
import * as common from '../cmd_common.js';
import { getTokens } from '../../ops/AuthenticateOps.js';
import storage from '../../storage/SessionStorage.js';
import { printMessage } from '../../ops/utils/Console.js';
import { validateImport } from '../../ops/utils/ExportImportUtils.js';
import { putApplication } from '../../api/ApplicationApi.js';

const program = new Command('frodo app import');

program
  .description('Import OAuth2 applications.')
  .helpOption('-h, --help', 'Help')
  .showHelpAfterError()
  .addArgument(common.hostArgumentM)
  .addArgument(common.realmArgument)
  .addArgument(common.userArgument)
  .addArgument(common.passwordArgument)
  .addOption(common.deploymentOption)
  .addOption(common.insecureOption)
  // .addOption(
  //   new Option(
  //     '-i, --cmd-id <cmd-id>',
  //     'Cmd id. If specified, only one cmd is imported and the options -a and -A are ignored.'
  //   )
  // )
  .addOption(new Option('-f, --file <file>', 'Name of the file to import.'))
  // .addOption(
  //   new Option(
  //     '-a, --all',
  //     'Import all cmds from single file. Ignored with -i.'
  //   )
  // )
  // .addOption(
  //   new Option(
  //     '-A, --all-separate',
  //     'Import all cmds from separate files (*.cmd.json) in the current directory. Ignored with -i or -a.'
  //   )
  // )
  .action(
    // implement command logic inside action handler
    async (host, realm, user, password, options) => {
      storage.session.setTenant(host);
      storage.session.setRealm(realm);
      storage.session.setUsername(user);
      storage.session.setPassword(password);
      storage.session.setDeploymentType(options.type);
      storage.session.setAllowInsecureConnection(options.insecure);
      if (await getTokens()) {
        printMessage(`Importing OAuth2 application(s) ...`);
        fs.readFile(options.file, 'utf8', (err, data) => {
          if (err) throw err;
          const applicationData = JSON.parse(data);
          if (validateImport(applicationData.meta)) {
            for (const id in applicationData.application) {
              if (
                Object.prototype.hasOwnProperty.call(
                  applicationData.application,
                  id
                )
              ) {
                delete applicationData.application[id]._provider;
                delete applicationData.application[id]._rev;
                putApplication(id, applicationData.application[id]).then(
                  (result) => {
                    if (!result == null) printMessage(`Imported ${id}`);
                  }
                );
              }
            }
          } else {
            printMessage('Import validation failed...', 'error');
          }
        });
      }
    }
    // end command logic inside action handler
  );

program.parse();
