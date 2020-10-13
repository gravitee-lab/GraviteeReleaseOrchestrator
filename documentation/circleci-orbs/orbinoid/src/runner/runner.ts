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
    private package_json: any;

    constructor() {
      this.checkDependencies();
      const this_package_json: any = JSON.parse(fs.readFileSync('./package.json','utf8'));
      console.log(`{[.CciCLIRunner]} =================== `);
      console.log(`{[.CciCLIRunner]} - package.json is : `);
      console.log(`{[.CciCLIRunner]} =================== `);
      console.log(this_package_json);
      console.log(`{[.CciCLIRunner]} =================== `);
      this.package_json = this_package_json;

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
    private checkDependencies() {
      console.log(` =============================== `);
      console.log(` = Orbinoid Dependencies Check = `);
      console.log(` =============================== `);
      console.log(` =++ [git] `);
      let CHECK_DEPENDENCY_CMD: string =`git --version`
      if (shelljs.exec(CHECK_DEPENDENCY_CMD).code !== 0) {
        shelljs.echo('Error : Orbinoid requires [git] as a dependency, and git is not installed on this system.');
        shelljs.exit(1);
      } else {
        shelljs.echo('Orbinoid [git] dependency found ');
      }
      console.log(` =++ [tree] `);
      CHECK_DEPENDENCY_CMD =`tree --version`
      if (shelljs.exec(CHECK_DEPENDENCY_CMD).code !== 0) {
        shelljs.echo('Error : Orbinoid requires [tree] as a dependency, and git is not installed on this system.');
        shelljs.exit(1);
      } else {
        shelljs.echo('Orbinoid [tree] dependency found ');
      }
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
        console.log(` === Initializing Orb source code in [${this.orb_prj_folder}] from Orb starter project `)
        console.log(` === Skipped [Initializing Orb] 'circleci orb init' command, because of https://github.com/CircleCI-Public/circleci-cli/issues/491`)
        /*
        let INIT_CMD: string =`${process.env.CCI_CLI_BINARY} orb init ${this.orb_prj_folder} --host ${process.env.CCI_SERVER} --token "${this.secrets.circleci.auth.token}"`
        if (shelljs.exec(INIT_CMD).code !== 0) {
          shelljs.echo('Error initializing Orb ');
          shelljs.exit(1);
        }*/
        /// instead, I will use the [ORB_STARTER] git repo as a starter orb template source code, to initialize content of the [orb/] folder
        /// A./ git clone [ORB_STARTER] into ${this.orb_prj_folder}
        /// A.bis/ git checkout [ORB_STARTER_VERSION], if not set, git checkout latest semver version tag, if none, warn it's not a stablerelease, but later master commit.
        /// B./ Replace [README.md] by [starter.README.md]
        /// C./ run pack and validate, to check generated orb.yml, keep exit code somewhere and remove the generated
        /// D./ based on exit code check if validation passed, console log  instructions "Now run [npm start] to build your Orb"
        /// E./ if validation did not pass, console log the [ORB_STARTER] git uri of the starter and say it has a problem, can't use it,
        let INIT_CMD: string =`git clone ${process.env.ORB_STARTER} ${this.orb_prj_folder}`
        if (shelljs.exec(INIT_CMD).code !== 0) {
          shelljs.echo(`Error git cloning Circle CI Orb Starter Project [${process.env.ORB_STARTER}] in [${this.orb_prj_folder}] workspace.`);
          shelljs.exit(1);
        }
        INIT_CMD =`cd ${this.orb_prj_folder} && git checkout ${process.env.ORB_STARTER_VERSION}`
        if (shelljs.exec(INIT_CMD).code !== 0) {
          shelljs.echo(`Error git checkouting the [${process.env.ORB_STARTER_VERSION}] version ofthe Circle CI Orb Starter Project [${process.env.ORB_STARTER}].`);
          shelljs.exit(1);
        }
        INIT_CMD =`cp -f ${this.orb_prj_folder}/starter.README.md ${this.orb_prj_folder}/README.md && rm ${this.orb_prj_folder}/starter.README.md`
        if (shelljs.exec(INIT_CMD).code !== 0) {
          shelljs.echo(`Error : it seems like [${process.env.ORB_STARTER}] misses a [starter.README.md] on its  [${process.env.ORB_STARTER_VERSION}] git version.`);
          shelljs.exit(1);
        }
        console.log(` === Succesfully initialized Orb Project in [${this.orb_prj_folder}] from Starter [${process.env.ORB_STARTER}]`);
        INIT_CMD =`tree ${this.orb_prj_folder}`
        if (shelljs.exec(INIT_CMD).code !== 0) {
          shelljs.exit(1);
        }
      }

      console.log(` === Current Folder `)
      let PRE_CMD: string =`pwd && tree ${this.orb_prj_folder} && ls -allh .`
      if (shelljs.exec(PRE_CMD).code !== 0) {
        shelljs.echo('Error inspecting Circle CI Orb Project workspace tree.');
        shelljs.exit(1);
      }

      console.log(` === Packing the Circle CI Orb`)
      let CCI_CLI_CMD: string=`${process.env.CCI_CLI_BINARY} orb pack ${this.orb_prj_folder}/src | tee ${this.orb_prj_folder}/src/orb.yml`
      if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
        shelljs.echo('Error packing Orb with [FYAML](https://github.com/CircleCI-Public/fyaml) Standard ');
        shelljs.exit(1);
      }

      console.log(` === Validating the packed Circle CI Orb`)
      CCI_CLI_CMD =`${process.env.CCI_CLI_BINARY} orb validate ${this.orb_prj_folder}/src/orb.yml`
      if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
        shelljs.echo('Error validating Orb ');
        shelljs.exit(1);
      } // so if packed orb is validated, then we can (test n) publish

      console.log(` === Creating Circle CI Orb namespace [${process.env.ORB_NAMESPACE}] in remote Orb registry`)
      CCI_CLI_CMD =`${process.env.CCI_CLI_BINARY} namespace create ${process.env.ORB_NAMESPACE} ${process.env.VCS_TYPE} ${process.env.VCS_ORG_NAME} --no-prompt`
      if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
        shelljs.echo(`Error Creating Circle CI Orb namespace [${process.env.ORB_NAMESPACE}]`);
        /// shelljs.exit(1);
      }


      /// === Creating Circle CI Orb in remote Orb registry
      /*
      let this_orb_name:string = null;
      if(process.env.ORB_NAME === undefined) {
        this_orb_name = this.package_json.name;
      } else {
        this_orb_name = process.env.ORB_NAME;
      }*/
      console.log(` === Creating Circle CI Orb [${process.env.ORB_NAMESPACE}/${process.env.ORB_NAME}] in remote Orb registry`)
      CCI_CLI_CMD =`${process.env.CCI_CLI_BINARY} orb create ${process.env.ORB_NAMESPACE}/${process.env.ORB_NAME} --no-prompt`
      if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
        shelljs.echo(`Error Creating Circle CI Orb [${process.env.ORB_NAMESPACE}/${process.env.ORB_NAME}] in remote Orb registry`);
        /// shelljs.exit(1);
      }

      if (process.argv["publish"]) {
        /// circleci orb publish orb/src/@orb.yml orbinoid/ubitetorbi@0.0.1
        /*
        let this_orb_version:string = null;
        if(process.env.ORB_VERSION === undefined) {
          this_orb_version = this.package_json.version;
        } else {
          this_orb_version = process.env.ORB_VERSION;
        }*/
        console.log(` === Publishing Circle CI Orb [${process.env.ORB_NAMESPACE}/${process.env.ORB_NAME}:${process.env.ORB_VERSION}] to remote Orb registry`)

        CCI_CLI_CMD =`${process.env.CCI_CLI_BINARY} orb publish ${this.orb_prj_folder}/src/orb.yml ${process.env.ORB_NAMESPACE}/${process.env.ORB_NAME}@${process.env.ORB_VERSION}`
        if (shelljs.exec(CCI_CLI_CMD).code !== 0) {
          shelljs.echo(`Error Publishing Circle CI Orb [${process.env.ORB_NAMESPACE}/${process.env.ORB_NAME}@${process.env.ORB_VERSION}] in remote Orb registry`);
          shelljs.exit(1);
        }
      }
    }



}
