/// import * as whatever from '@some/pkgIneed';

/**
 * A Template prototype POO structure for all  Orchestrator types :
 * classes, abstract classes, interfaces, and namespaces. Also on how
 * to handle Args type checking.
 **/

  export interface GraviteeComponentArgs {
    name: string;
    version: string;
  }

  /**
   *
   *
   **/
  export class GraviteeComponent {

    public readonly name: string;
    public readonly version: string;

    ///


    constructor (
      args: GraviteeComponentArgs
    ) {
      /// super(`valueofContructorParamOne`, args)


      this.name = args.name;
      this.version = args.version;


      const something = 'ccc';


    }


  }
