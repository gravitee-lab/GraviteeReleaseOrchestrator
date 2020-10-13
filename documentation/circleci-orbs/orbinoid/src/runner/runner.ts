import * as shelljs from 'shelljs';
import * as fs from 'fs';

export interface CircleCISecrets {
  circleci: {
    auth: {
      username: string,
      token: string
    }
  }
}

/**
 *
 * Mimics the official Circle CI cLient, only much simpler, and with [RxJS]
 * Circle CI API v2 based
 **/
export class CciCLIRunner {
  private secrets: CircleCISecrets;
  private orb_prj_folder: string;

  constructor() {
    this.orb_prj_folder = './orb';
    this.loadCircleCISecrets();
    let CCI_CLI_CMD: string =`${process.env.CCI_CLI_BINARY} setup --token "${this.secrets.circleci.auth.token}" --host ${process.env.CCI_SERVER} --no-prompt`
    if (shelljs.exec(CCI_CLI_CMD).code !== 0) { // synchrone sleep to simulate waiting for Pipeline execution to complete. (RxJS Subscription)
      throw new Error('Error setting up Circle CI CLI Orb ');
      // shelljs.exit(1);
    }
    CCI_CLI_CMD =`${process.env.CCI_CLI_BINARY} diagnostic`
    if (shelljs.exec(CCI_CLI_CMD).code !== 0) { // synchrone sleep to simulate waiting for Pipeline execution to complete. (RxJS Subscription)
      throw new Error('Error running [circleci diagnsostic] command ');
      // shelljs.exit(1);
    }
  }

  loadCircleCISecrets () : void { ///     private secrets: CircleCISecrets;
    /// first load the secretfile

    let secretFileAsString: string = fs.readFileSync(process.env.CCI_SECRETS_FILE_PATH,'utf8');
    this.secrets = JSON.parse(secretFileAsString);
  }

    /**
     * Runs all Shell commands for the Dev cycle of a Circle CI Orb
     *
     * -----
     *
     *
     * @returns any But it actually is an Observable Stream of the HTTP response you can subscribe to.
     **/
    run(): void {

      if (process.argv["init"]) {
        console.log(` === Initializing Orb `)
        console.log(` === Skipped [Initializing Orb] 'circleci orb init' command, because of https://github.com/CircleCI-Public/circleci-cli/issues/491`)
        /*
        let INIT_CMD: string =`${process.env.CCI_CLI_BINARY} orb init ${this.orb_prj_folder} --host ${process.env.CCI_SERVER} --token "${this.secrets.circleci.auth.token}"`
        if (shelljs.exec(INIT_CMD).code !== 0) {
          shelljs.echo('Error initializing Orb ');
          shelljs.exit(1);
        }*/
      }

      console.log(` === Current Folder `)
      let PRE_CMD: string =`pwd && tree ${this.orb_prj_folder} && ls -allh .`
      if (shelljs.exec(PRE_CMD).code !== 0) {
        shelljs.echo('Error inspecting Circle CI Orb Project workspace tree.');
        shelljs.exit(1);
      }

      console.log(` === Packing the Circle CI Orb`)
      let CCI_CLI_CMD: string=`${process.env.CCI_CLI_BINARY} orb pack ${this.orb_prj_folder}/src`
      if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
        shelljs.echo('Error packing Orb with [FYAML](https://github.com/CircleCI-Public/fyaml) Standard ');
        shelljs.exit(1);
      }

      console.log(` === Validating the packed Circle CI Orb`)
      CCI_CLI_CMD =`${process.env.CCI_CLI_BINARY} orb validate ${this.orb_prj_folder}/src/@orb.yml`
      if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
        shelljs.echo('Error validating Orb ');
        shelljs.exit(1);
      } // so if packed orb is validated, then we can (test n) publish

      console.log(` === Creating Circle CI Orb namespace in remote Orb registry`)
      CCI_CLI_CMD =`${process.env.CCI_CLI_BINARY} namespace create ${process.env.ORB_NAMESPACE} ${process.env.VCS_TYPE} ${process.env.VCS_ORG_NAME} --no-prompt`
      if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
        shelljs.echo(`Error Creating Circle CI Orb namespace [${process.env.ORB_NAMESPACE}]`);
        /// shelljs.exit(1);
      }

      console.log(` === Creating Circle CI Orb in remote Orb registry`)
      CCI_CLI_CMD =`${process.env.CCI_CLI_BINARY} orb create ${process.env.ORB_NAMESPACE}/${process.env.ORB_NAME} --no-prompt`
      if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
        shelljs.echo(`Error Creating Circle CI Orb [${process.env.ORB_NAME}] in remote Orb registry`);
        /// shelljs.exit(1);
      }
      if (process.argv["publish"]) {
        /// circleci orb publish orb/src/@orb.yml orbinoid/ubitetorbi@0.0.1
        console.log(` === Publishing Circle CI Orb to remote Orb registry`)
        CCI_CLI_CMD =`${process.env.CCI_CLI_BINARY} orb publish ${this.orb_prj_folder}/src/@orb.yml ${process.env.ORB_NAMESPACE}/${process.env.ORB_NAME}@${process.env.ORB_VERSION}`
        if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
          shelljs.echo(`Error Publishing Circle CI Orb [${process.env.ORB_NAME}] in remote Orb registry`);
          shelljs.exit(1);
        }
      }
    }



}
