import * as executionsets from './ParallelExecutionSet';

/**
 * An Execution Plan represents a Matrix (2-dim. array), of {@see executionsets.ParallelExecutionSet}s :
 *
 **/

  export interface ExecutionPlanArgs {
    parallelExecutionSets: executionsets.ParallelExecutionSet[];
  }

  /**
   *
   *
   **/
  export class ExecutionPlan {

    public readonly parallelExecutionSets: executionsets.ParallelExecutionSet[];

    constructor (
      args: ExecutionPlanArgs
    ) {
      /// super(`valueofContructorParamOne`, args)


      this.parallelExecutionSets = args.parallelExecutionSets;

    }
    /**
     * Returns the {@see executionsets.ParallelExecutionSet} which will be executed as <code>ofIndex</code>-th place :
     *
     * It will be executed after the <code>ofIndex - 1</code> previous ones have completed their execution
     *
     * @argument <code>ofIndex</code> the index of the {@see ParallelExecutionSet}
     * @returns the {@see executionsets.ParallelExecutionSet} which will be executed as <code>ofIndex</code>-th 
     *
     **/
    getparallelExecutionSet(ofIndex: number): executionsets.ParallelExecutionSet {
      return this.parallelExecutionSets[ofIndex];
    }
  }
