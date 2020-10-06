import * as rxjs from 'rxjs';
import { CircleCIClient, WorkflowsData, WorkflowJobsData, WfPaginationRef, JobPaginationRef } from '../../../modules/circleci/CircleCIClient';
import * as reporting from '../../../modules/circleci/status/PipelineExecSetReport';
import * as shelljs from 'shelljs';

export interface PipeExecSetStatusNotification {
  is_errored: boolean
}

export interface EmptyCat { // Because this is the only Type which has only one possible instance, the Empty Set : {}.andalso the only type which is exactly equal to one ofits instances. It is not the EmptySet, because no set Ehas the property : E is an element of E.
}
// EmptyCat could be useful to define progressMatrixUpdatesNotifier: rxjs.Subject<EmptyCat>();
// Indeed, this notifier [next:] callback does not need to retrieve [this.progressMatrix] from
// its paramters, since it already is a member of the [PipelineExecSetStatusWatcher] instance
// Never the less, passing as paramters of the callback, the progressMatrix,might be useful tomake binding the callback useless (binding a method to an object is something I do not like doing)

/**
 *
 * ---
 * Keeps fetching the Circle CI API, to determine when either :
 * => all Pipelines referenced in <code>this.progressMatrix</code>
 * have successfully completed their execution,
 * => or one Pipeline has reached a final execution state, but did not successfully completed
 * => or timeout has been reached
 * ---
 *
 **/
export class PipelineExecSetStatusWatcher {

  /**
   * This RxJS Subject will emit an integer :
   * => To notify the subscribers that all pipelines in this
   *    Pipeline Execution Set have reached a final execution
   *    state : Final State In the sense of Automata theory
   * => The emited integer is the index of this Pipeline Execution State in the Execution Plan (Array)
   * ---
   * The pattern with the RxJS Subject :
   * A./ Subcribers subscribe to the Subject
   * B./ this {@link PipelineExecSetStatusWatcher} will emit a {@link PipeExecSetStatusNotification}
   *     with <code>this.finalStateNotifier.next()</code> method, only after <code>this.start()</code> is invoked.
   * ---
   * The {@link ReactiveParallelExecutionSet} subscribes to this RxSubject, so that it
   * is notified when all Pipelines have reached a final execution state, with or without errors.
   **/
  public readonly finalStateNotifier: rxjs.Subject<PipeExecSetStatusNotification>;

  /**
   * This is the progress matrix for all pipeline executions
   * in one {ParallelExecutionSet}, built by a <code>src/modules/circleci/PipelineExecSetStatusWatcher.ts</code>, not
   * the whole execution plan, as understood by the {@link CircleCiOrchestrator} class.
   * --
   * It is filled with all the HTTP JSON responses of Circle CI API HTTP request to trigger pipelines.
   * --
   * Each entry in this array is of the following form :
   *
   *
   * {
   *   pipeline_exec_number: '2',
   *   id: 'ef4264c2-f6f4-4cc4-a928-e7f89f3aff90',
   *   created_at: '2020-09-30T10:59:27.610Z',
   *   exec_state: 'pending'
   * }
   *
   *
   * --
   **/
  private progressMatrix: any[];
  private circleci_client: CircleCIClient;


  /**
   * Will be updated for every {progressMatrix} entries, until allmatch <code>this.watch_round</code>
   **/
  private watch_round: number;
  /**
   * This RxJS Subject is there to detect when the [progressMatrix] has been updated
   **/
  private progressMatrixUpdatesNotifier: rxjs.Subject<any[]>;
  /**
   * This RxJS Subject will be used to paginate The Circle CI API
   * [GET /api/v2/pipeline/${PARENT_PIPELINE_GUID}/workflow] Endpoint
   * toget all workflows of a given Circle CI Pipeline Execution
   **/
  private workflowPaginationNotifier: rxjs.Subject<WfPaginationRef>;
  /**
   * Just to keep a reference over all RxJS Subscriptions, except the subsciption to
   * the [finalStateNotifier] : to be able to unsubscribe when desired
   **/
  private rxSubscriptions: rxjs.Subscription[];

  constructor(progressMatrix: any[], circleci_client: CircleCIClient) {
    console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [constructor] - I am the constructor, I actually am called`);
    this.progressMatrix = progressMatrix;
    this.finalStateNotifier = new rxjs.Subject<PipeExecSetStatusNotification>();
    this.workflowPaginationNotifier = new rxjs.Subject<WfPaginationRef>();
    this.progressMatrixUpdatesNotifier = new rxjs.Subject<any[]>();
    this.circleci_client = circleci_client;
    this.initPrivateNotifersSubscriptions();
    /// --- INIT WATCH ROUND

    /// ---
    /// For each [progressMatrix] entry, 2 new JSON properties :
    ///
    /// + [workflows_exec_state] : an Array which will contain all the Circle CI API paginated entries of
    ///                          the [items] array returned by the [GET /api/v2/pipeline/${PARENT_PIPELINE_GUID}/workflow] Circle CI API Enpoint
    ///                          those entries contain the Execution State of every workflow of a given Pipeline Execution (one Piepline Execution <=> one [progressMatrix] entry)
    ///
    /// + [watch_round] : a number, which will say how many times the [workflows_exec_state] JSON
    ///                   property hasbeen updated, by querying the Circle CI API
    ///                   [GET /api/v2/pipeline/${PARENT_PIPELINE_GUID}/workflow] Endpoint


    for (let y: number = 0; y < this.progressMatrix.length; y++) {
      this.progressMatrix[y].watch_round = 0;
      this.progressMatrix[y].workflows_exec_state = []
      console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [constructor] - Inspecting object [ this.progressMatrix[${y}] ] : `);
      console.log(`----`);
      /// console.log(`${JSON.stringify({ inspectedArrayItem: this.progressMatrix[y] })}`);
      console.log({progressMatrix: this.progressMatrix});
      console.log(`----`);
    }
    console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [constructor] - AFTER FOR LOOP - Inspecting Array [ this.progressMatrix ] : `);
    console.log(`----`);
    // console.log(`${JSON.stringify({ inspectedArray: this.progressMatrix })}`);
    console.log({
      progressMatrix: this.progressMatrix
    });
    console.log(`----`);

    /// [{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] - Inspecting object [ this.progressMatrix

    /// this.watch_round will be incremented everytime all [progressMatrix] entries have
    /// been updated with a new execution state in the [workflows_exec_state] JSON Property
    ///
    this.watch_round = 0; // initializing watch_round before the first round
    ///
  }

  private initPrivateNotifersSubscriptions () { // all but [this.finalStateNotifier]

    this.rxSubscriptions = [];

    let wfPaginationSubscription = this.workflowPaginationNotifier.subscribe({
        next: (paginator) => {
          console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [this.workflowPaginationNotifier SUBSCRIPTION] - paginating Circle CI for workflows to page [${paginator.next_page_token}] for Circle CI Pipeline [${paginator.pipeline_guid}]`);
          this.updateProgressMatrixWorkflowsExecStatus(paginator.pipeline_guid, paginator.next_page_token)
          /**
          setTimeout(() => {
            this.updateProgressMatrixWorkflowsExecStatus(paginator.pipeline_guid, paginator.next_page_token)
          }, parseInt(process.env.EXEC_STATUS_WATCH_INTERVAL));
          */

        }
    });

    let progressMatrixUpdatesSubscription = this.progressMatrixUpdatesNotifier.subscribe({
        next: (progressMatrix) => {
          // here we have to check if, for all entries of the [progressMatrix], the
          // [watch_round] JSON Property are equal to [this.watch_round]
          // If yes, then we have to :
          //
          //  => check if all Pipelines Workflows Execution have reached a 'success' status :
          //     ++ If not, we know there is no Workflow execution for which a problem occured, because
          //        the [handleInspectPipelineExecStateResponseData (observedResponse: WorkflowsData)] gurantees that.
          //        Sowe can launch a new watch_round, by calling (again) the [launchExecStatusInspectionRound()] method (which
          //        will query again Circle CI to update workflows execution status' )
          //     ++ If yes we annihilate timeout by unsubscribing the RXJS timer, and we call the finalStateNotifier.next() method
          // the timeout will be triggered if it was not annihilated, by an RxJS timer
          // The RxJS Timer will not throw any Error, but instead build and log execution report, passing as constructor third parameter, a new Error("Explaining that no Workflow Execution Error was detected, it's just that the CICD Stage timed out");


          console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [this.progressMatrixUpdatesNotifier SUBSCRIPTION] - this.progressMatrix is :`);
          console.log(`----`);
          console.log(`${JSON.stringify({ inspectedArray: this.progressMatrix }, null, " ")}`);
          /// console.log({progressMatrix: this.progressMatrix});
          console.log(`----`);

          if(this.isWatchRoundOver()) {
            if(this.haveAllPipelinesSuccessfullyCompleted()) {
              /// Now, when All Pipelines in the progressMatrix have successfully
              /// completed their execution, hey, job is finished, let's tell that to
              /// the {@link ReactiveParallelExecutionSet}

              console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [this.progressMatrixUpdatesNotifier SUBSCRIPTION] - All Workflows ofall Pipelines in [this.progressMatrix] have reached 'success' execution status ! :D  `);
              console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [this.progressMatrixUpdatesNotifier SUBSCRIPTION] - [this.progressMatrix] finally is  : `);
              console.log(`----`);
              console.log(`${JSON.stringify({ finalProgressMatrix : this.progressMatrix }, null, " ")}`);
              /// console.log({progressMatrix: this.progressMatrix});
              console.log(`----`);

            } else { // we know there is no Workflow execution for which a problem occured, because
                     // the [handleInspectPipelineExecStateResponseData (observedResponse: WorkflowsData)] gurantees that.
                     // So we can launch a new watch_round, by calling (again) the [launchExecStatusInspectionRound()] method (which
                     // will query again Circle CI to update workflows execution status' )

               console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [this.progressMatrixUpdatesNotifier SUBSCRIPTION] - laucnching a new watch round in [${parseInt(process.env.EXEC_STATUS_WATCH_INTERVAL)}] milliseconds.`);
               /// setTimeout(this.launchExecStatusInspectionRound, 2 * parseInt(process.env.EXEC_STATUS_WATCH_INTERVAL));

               setTimeout(() => {
                 this.launchExecStatusInspectionRound()
               }, parseInt(process.env.EXEC_STATUS_WATCH_INTERVAL));

            }

          } else {
            console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [this.progressMatrixUpdatesNotifier SUBSCRIPTION] - The watch round is not over, So not launching a new watch just now, let the {for loop} in the current watch round complete ({for loop} tha tis inthe [this.launchExecStatusInspectionRound] method) `);
          }
          /// throw new Error("That's where I am working now");

        },
        complete: () => {
          console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [this.progressMatrixUpdatesNotifier SUBSCRIPTION] - COMPLETE`);
        },
        error: (error) => {
          console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [this.progressMatrixUpdatesNotifier SUBSCRIPTION] - ERROR: `);
          console.log(`${error}`);

        }
    });

    this.rxSubscriptions.push(wfPaginationSubscription);
    this.rxSubscriptions.push(progressMatrixUpdatesSubscription);
  }

  public start() {
    // won't start
    console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [start()] - actually starting in  [${2 * parseInt(process.env.EXEC_STATUS_WATCH_INTERVAL)}] milliseconds.`);
    /// setTimeout(this.launchExecStatusInspectionRound, 2 * parseInt(process.env.EXEC_STATUS_WATCH_INTERVAL));

    setTimeout(() => {
      this.launchExecStatusInspectionRound()
    }, 2 * parseInt(process.env.EXEC_STATUS_WATCH_INTERVAL));

  }

  private launchExecStatusInspectionRound (): void {
    /// First increment watch_round, to start next round
    this.watch_round++;
    // then sending all HTTP Request to Circle CI and update progressMatrix entries
    this.updateProgressMatrixWithAllWorkflowsExecStatus();

    /// throw new Error("DEBUG STOP That's where I'm working now");
    // we build an execution state report, and send it with PipeExecSetStatusNotification to {@link ReactiveParallelExecutionSet}
    /// let reactiveReporter = new reporting.PipelineExecSetReportLogger(this.progressMatrix, this.circleci_client);

  }

  /**
   * ---
   * This method queries the CircleCI API and adds or updates each entry of
   * the <code>this.progressMatrix</code> array's [workflows_exec_state] JSon property
   *
   * each entry of the <code>this.progressMatrix</code> array matches a Circle CI Pipeline in a [ReactiveParallelExecutionSet] Parallel Execution Set
   * ---
   * Now, when :
   *
   * => all Pipelines have reached a final execution state,
   * => or any Pipeline has reach a final execution state with errors,
   *
   * Then this method will :
   * => build and log the execution report using {@link reporting.PipelineExecSetReport}
   * => and call the next() method of the <code>this.finalStateNotifier</code> RxJS Subject, to notify its {@link ReactiveParallelExecutionSet} friend the Parallel Execution Set has reached an Execution Final State
   * ---
   *
   **/
  private updateProgressMatrixWithAllWorkflowsExecStatus (): void {

    console.log("");
    console.log('+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x')
    console.log("{[PipelineExecSetStatusWatcher]} - [{updateProgressMatrixWithAllWorkflowsExecStatus}] Updating Progress Matrix Execution state of each Pipeline : ");
    console.log('+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x')
    console.log(" ---");
    /// console.log(JSON.stringify({ progressMatrix: this.progressMatrix }, null, " "));
    console.log({progressMatrix: this.progressMatrix});
    console.log(" ---");
    console.log('+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x')
    console.log("");

    /**
     * launch all HTTP Requests to update all entries in the [progressMatrix] 's [workflows_exec_state] JSON Property
     **/
    for (let k = 0; k < this.progressMatrix.length; k++) {
      this.updateProgressMatrixWorkflowsExecStatus(this.progressMatrix[k].id, null)
    }

  }
  /**
   * Updates the [progressMatrix] with the Workflows Execution Status for a given Pipeline of GUID [parent_pipeline_guid], with Circle CI API pagination option [next_page_token]
   **/
  private updateProgressMatrixWorkflowsExecStatus(parent_pipeline_guid: string, next_page_token: string) {
    console.log( `[{PipelineExecSetStatusWatcher}] - [updateProgressMatrixWorkflowsExecStatus(parent_pipeline_guid: string)] - value of Pipeline GUID : [${parent_pipeline_guid}]`);
    /*
    if (process.argv["dry-run"]) {
     console.log( '[{PipelineExecSetStatusWatcher}] - (process.argv["dry-run"] === \'true\') condition is true');
    } else {
     console.log( '[{PipelineExecSetStatusWatcher}] - (process.argv["dry-run"] === \'true\') condition is false');
    }
    */

    let inspectPipelineWorkflowsExecStateSubscription = this.circleci_client.inspectPipelineWorkflowsExecState(parent_pipeline_guid, next_page_token).subscribe({
      next: this.handleInspectPipelineExecStateResponseData.bind(this),
      complete: data => {
         console.log( `[{PipelineExecSetStatusWatcher}] - Inspecting Pipeline of GUID [${parent_pipeline_guid}] Workflows Execution state, in Circle CI Page [next_page_token=${next_page_token}]  completed! :) ]`)
         console.log(`[{PipelineExecSetStatusWatcher}] - and now, using the RxJS Subject to check if current watch_round is over`);
         /// and now, using the RxJS Subject to check if Watch Round is over
         this.progressMatrixUpdatesNotifier.next(this.progressMatrix);
      },
      error: this.errorHandlerInspectPipelineExecState.bind(this)
    });
  }

  /**
   *
   **/
  private haveAllPipelinesSuccessfullyCompleted(): boolean {
    let allPipeSuccess: boolean = true;
    for (let k: number = 0; k < this.progressMatrix.length; k++) {
      let wfArray = this.progressMatrix[k].workflows_exec_state
      for(let j: number = 0; j < wfArray.length; j++) {
        allPipeSuccess = allPipeSuccess && (wfArray[j].status === 'success')
      }
    }
    return allPipeSuccess;
    /// throw new Error(`[PipelineExecSetStatusWatcher] - [haveAllPipelinesSuccessfullyCompleted] not implemented yet`);
  }
  /**
   * returns true if the current watch round is over
   **/
  private isWatchRoundOver(): boolean {
    let isWatchRoundOver: boolean = true;

    console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [isWatchRoundOver] Current Watch Round is [this.watch_round = ${this.watch_round}]`)
    for (let k:number= 0; k < this.progressMatrix.length; k++) {
      isWatchRoundOver = isWatchRoundOver && (this.progressMatrix[k].watch_round == this.watch_round);
    }
    return isWatchRoundOver;
  }

  /**
   * This method
   * Note that the HTTP JSON Response will be ofthe following form :
   *
   *      {
   *        "next_page_token": null,
   *        "items": [
   *          {
   *            "pipeline_id": "b4f4eabc-d572-4fdf-916a-d5f05d178221",
   *            "id": "75e83261-5b3c-4bc0-ad11-514bb01f634c",
   *            "name": "docker_build_and_push",
   *            "project_slug": "gh/gravitee-lab/GraviteeCiCdOrchestrator",
   *            "status": "failed",
   *            "started_by": "a159e94e-3763-474d-8c51-d1ea6ed602d4",
   *            "pipeline_number": 126,
   *            "created_at": "2020-09-12T17:47:21Z",
   *            "stopped_at": "2020-09-12T17:48:26Z"
   *          },
   *          {
   *            "pipeline_id": "b4f4eabc-d572-4fdf-916a-d5f05d178221",
   *            "id": "cd7b408f-48d4-4ba7-8a0a-644d82267434",
   *            "name": "yet_another_test_workflow",
   *            "project_slug": "gh/gravitee-lab/GraviteeCiCdOrchestrator",
   *            "status": "success",
   *            "started_by": "a159e94e-3763-474d-8c51-d1ea6ed602d4",
   *            "pipeline_number": 126,
   *            "created_at": "2020-09-12T17:47:21Z",
   *            "stopped_at": "2020-09-12T17:48:11Z"
   *          }
   *        ]
   *      }
   *
   * ---
   *
   * Will update the progressMatrix Entry matching the [pipeline_id] in the [circleCiJsonResponse], like this :
   *
   *    from the following form :
   *    {
   *      pipeline_exec_number: 'unchanged_value',
   *      id : 'unchanged_value',
   *      created_at: 'unchanged_value',
   *      exec_state: 'unchanged_value'
   *    }
   *    to the following form :
   *    {
   *      pipeline_exec_number: 'unchanged_value',
   *      id : 'unchanged_value',
   *      created_at: 'unchanged_value',
   *      exec_state: 'unchanged_value',
   *      workflows_exec_state: `${observedResponse.cci_json_response.items}` // of type any[] (so an array)
   *      watch_round: N // where N is the number of times
   *    }
   *
   **/
  private handleInspectPipelineExecStateResponseData (observedResponse: WorkflowsData) : void {
    console.log('[{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] Processing Circle CI API Response [data] is : ', observedResponse.cci_json_response  /* circleCiJsonResponse.data // when retryWhen is used*/ )
    /// if the pipeline has zero workflows,then we have a problem here : so we stop all operations
    if (observedResponse.cci_json_response.items.length == 0) {
      throw new Error(`The Pipeline of GUID ${observedResponse.parent_pipeline_guid} has no workflows, which is an anomaly, so stopping all operations.`)
    }

    let pipelineIndexInProgressMatrix = this.getIndexInProgressMatrixOfPipeline(observedResponse.parent_pipeline_guid);

    /// ---
    /// Here looping and pushing each entries, one after the other, to be able to
    /// cumulatively add all Workflow States in
    let occuredProblem = null;
    console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] [occuredProblem = ${occuredProblem}]`)
    for (let k:number= 0; k < observedResponse.cci_json_response.items.length; k++) {
      let wflowstate = observedResponse.cci_json_response.items[k];


      /// this.progressMatrix[pipelineIndexInProgressMatrix].workflows_exec_state.push(wflowstate);
      this.updateWflowstateIn(wflowstate,this.progressMatrix[pipelineIndexInProgressMatrix].workflows_exec_state)
      console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] - In FOR LOOP Inspecting object [ this.progressMatrix[${pipelineIndexInProgressMatrix}] ] : `);
      console.log(`----`);
      console.log(`${JSON.stringify(this.progressMatrix[pipelineIndexInProgressMatrix], null, " ")}`);
      /// console.log({progressMatrix: this.progressMatrix});
      console.log(`----`);



      /// --- ///
      /// Here we check if the execution status of the workflow makes us sure a problem has occured, and
      /// if so, we build and log a {@link PipelineExecSetReport}, passing it an Error to throw
      ///
      /// Looping through array, to be able to paginate, and cumulatively add
      /// workflow states returned by the Circle CI API

      let erroMsg = `For Circle CI Pipline of GUID [${observedResponse.parent_pipeline_guid}], the [${wflowstate.name}] workflow of GUID [${wflowstate.id}] `;
      if (wflowstate.status === 'failed') {
        erroMsg = erroMsg + ` completed its execution with errors`;
        occuredProblem = new Error(erroMsg);
      } else if (wflowstate.status === 'error') {
        erroMsg = erroMsg + ` failed to run because of syntax errors within the [.circleci/config.yml]`;
        occuredProblem = new Error(erroMsg);
      } else if (wflowstate.status === 'failing') {
        erroMsg = erroMsg + ` at least one job already failed, although not all job have completed their execution`;
        occuredProblem = new Error(erroMsg);
      } else if (wflowstate.status === 'canceled') {
        erroMsg = erroMsg + ` has failed to complete its execution, because some human canceled the Pipeline execution`;
        occuredProblem = new Error(erroMsg);
      } else if (wflowstate.status === 'unauthorized') {
        erroMsg = erroMsg + ` failed to run because the Circle CI user who triggered the Pipeline is unauthorized to run this Pipeline.`;
        occuredProblem = new Error(erroMsg);
      }
      console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] [occuredProblem = ${occuredProblem}] inside wfstate loop`)
      if (!(occuredProblem === null)) {
        console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] - inside if where [PipelineExecSetReportLogger] is instantitated, passing to constructor the Error : [occuredProblem = ${occuredProblem}] `)
        /// the [PipelineExecSetReportLogger] willthrow the Error, stopping all CI CD Operations
        let reactiveReporter = new reporting.PipelineExecSetReportLogger(this.progressMatrix, this.circleci_client, occuredProblem);
      }
    }


    /// -------------
    ///  All Workflow Execution Statuses
    ///     | CircleCI Pipeline Workflow Execution Status value  |  Description  of what happened                                                                  |
    ///     |----------------------------------------------------|-------------------------------------------------------------------------------------------------|
    ///     | `success`                                          |  execution completed without any error                                                          |
    ///     | `running`                                          |  execution is running                                                                           |
    ///     | `not_run`                                          |  execution is scheduled, but did not start yet                                                  |
    ///     | `failed`                                           |  execution completed with errors                                                                |
    ///     | `error`                                            |  execution was canceled, because of `.circleci/config.yml` syntax errors                        |
    ///     | `failing`                                          |  execution is still running, and at least one error already occured, without stopping execution. Actually at least one job failed, but not all job have completed execution |
    ///     | `on_hold`                                          |  waiting for approval (workflows was configured to require an approval, before being scheduled see [this forum entry](https://discuss.circleci.com/t/do-on-hold-jobs-count-against-time-quota/24136) and  [this Circle CI doc entry](https://circleci.com/docs/2.0/workflows/#holding-a-workflow-for-a-manual-approval) )                                                                   |
    ///     | `canceled`                                         |  someone canceled the execution                                                                 |
    ///     | `unauthorized`                                     |  an unauthorized Circle CI user requested the execution, using `Circle CI` API, and it was therefore denied |

    ///////
    ///
    /// finally, If no workflow execution had a problem, Then
    /// we check if there are more Workflows to paginate, to execute again the
    /// [this.updateProgressMatrixWorkflowsExecStatus(paginator.pipeline_guid, paginator.next_page_token);]
    /// method with Circle CI [next_page_token], if necessary.
    /// We'll do that until last "page"
    /// ---
    console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] [occuredProblem = ${occuredProblem}] before pagination mgmt`)
    if (occuredProblem === null) {
      console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] [occuredProblem = ${occuredProblem}] insid (if) for pagination management`)
        if (observedResponse.cci_json_response.next_page_token === null) {
          console.log(`[{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] finished workflow pagination to update [progressMatrix], so now incrementing [watch_round]`)
          console.log(`[{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] before incrementing [ this.progressMatrix[${pipelineIndexInProgressMatrix}].watch_round = [${this.progressMatrix[pipelineIndexInProgressMatrix].watch_round}] ]`);
          this.progressMatrix[pipelineIndexInProgressMatrix].watch_round++;

        } else {
          let paginator: WfPaginationRef = {
             next_page_token: observedResponse.cci_json_response.next_page_token,
             pipeline_guid: observedResponse.parent_pipeline_guid
          }
          this.workflowPaginationNotifier.next(paginator);
        }
    } else {
      console.log(`[{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData]  A problem was detected with a Workflow execution in the Circle CI Pipline of GUID [${observedResponse.parent_pipeline_guid}], so a fatal [PipelineExecSetReportLogger] was instantiated, with a non-null [Error] passed to constructor, will build and log Execution Report, and stop all CICD Operations.   `);
    }

    console.log(`DEBUG [{PipelineExecSetStatusWatcher}] - [handleInspectPipelineExecStateResponseData] - AFTER PUSHING RETRIEVED WORKFLOW STATES - Inspecting Array [ this.progressMatrix ] : `);
    console.log(`----`);
    console.log(`${JSON.stringify({ inspectedArray: this.progressMatrix }, null, " ")}`);
    /// console.log({progressMatrix: this.progressMatrix});
    console.log(`----`);
  }

  /**
   * For each entry (Circle CI Pipeline) in <code>this.progressMatrix</code>, a JSON Property named [workflows_exec_state]
   * holds the Circle CI Pipeline 's Workflows execution states :
   * => [workflows_exec_state] is an array
   * => each entry in [workflows_exec_state], matches a workflow, uniquely identified by its 'id'JSON Property :
   *
   * ---
   *      {
   *        /// one example [progressMatrix] entry
   *        "pipeline_exec_number": "39",
   *        "id": "71c6d01e-9a87-4b84-9fa7-12d241e374de",
   *        "created_at": "2020-10-06T15:11:32.262Z",
   *        "exec_state": "pending",
   *        "project_slug": "gh/gravitee-lab/gravitee-fetcher-api",
   *        "watch_round": 2,
   *        "workflows_exec_state": [
   *          {
   *            "pipeline_id": "b4f4eabc-d572-4fdf-916a-d5f05d178221",
   *            "id": "75e83261-5b3c-4bc0-ad11-514bb01f634c",
   *            "name": "docker_build_and_push",
   *            "project_slug": "gh/gravitee-lab/gravitee-json-imaginary-policy",
   *            "status": "failed",
   *            "started_by": "a159e94e-3763-474d-8c51-d1ea6ed602d4",
   *            "pipeline_number": 126,
   *            "created_at": "2020-09-12T17:47:21Z",
   *            "stopped_at": "2020-09-12T17:48:26Z"
   *          },
   *          {
   *            "pipeline_id": "b4f4eabc-d572-4fdf-916a-d5f05d178221",
   *            "id": "cd7b408f-48d4-4ba7-8a0a-644d82267434",
   *            "name": "yet_another_test_workflow",
   *            "project_slug": "gh/gravitee-lab/gravitee-json-imaginary-policy",
   *            "status": "success",
   *            "started_by": "a159e94e-3763-474d-8c51-d1ea6ed602d4",
   *            "pipeline_number": 126,
   *            "created_at": "2020-09-12T17:47:21Z",
   *            "stopped_at": "2020-09-12T17:48:11Z"
   *          }
   *        ]
   *      }
   *
   * ---
   * This method :
   * adds the provided <code>wflowstate</code>, to the provided <code>inThis_workflows_exec_state</code> array,
   * or updates the provided <code>wflowstate</code>, to the provided <code>inThis_workflows_exec_state</code> array,
   *
   * ensuring unicity of Workflow <code>id</code>s in the [workflows_exec_state] JSON property of each entry in <code>this.progressMatrix</code>
   *
   * This behavior typically shows that The global software design should as soon as possible
   * strongly type <code>this.progressMatrix</code>, to make its  [workflows_exec_state] JSON property, an acutal member of a Class, with a Set Collection Type (unicity behavior,andequels based on [id]).
   **/
  private updateWflowstateIn(wflowstate: any, inThis_workflows_exec_state: any[] ) {
    ///
    let isTheWorkflowIDalreadyReferenced: boolean = false;
    let wfIndexInarray: number = null;

    if(!wflowstate.hasOwnProperty('id')) {
      throw new Error(`[{PipelineExecSetStatusWatcher}] - [{updateWflowstateIn(wflowstate: any, inThis_workflows_exec_state: any[] )}] provided [${wflowstate}] ahs no [id] property, while it is expected to have one, as a Workflow State CircleCI API JSON Response...`)
    }

    for (let k: number = 0; k < inThis_workflows_exec_state.length; k++) {
      if (inThis_workflows_exec_state[k].id === wflowstate.id) {
        isTheWorkflowIDalreadyReferenced = true;
        wfIndexInarray = k;
        break;
      }
    }
    if (isTheWorkflowIDalreadyReferenced) { /// then it's an update case
      inThis_workflows_exec_state[wfIndexInarray] = wflowstate /// (replaces the entryin array)
    } else { // then case when we just have to add it
      inThis_workflows_exec_state.push(wflowstate) // adds a new entry in array, aka [wflowstate]
    }

    inThis_workflows_exec_state
  }

  /**
   *
   **/
  private errorHandlerInspectPipelineExecState (error: any) : void {
    console.log( '[{PipelineExecSetStatusWatcher}] - [errorHandlerInspectPipelineExecState] - Inspecting Circle CI pipeline failed Circle CI API Response [data] => ', error )
    let entry: any = {};
    entry.pipeline = {
      execution_index: null,
      id : null,
      created_at: null,
      exec_state: null,
      error : {message: "[{PipelineExecSetStatusWatcher}] - [errorHandlerInspectPipelineExecState] - Inspecting Circle CI pipeline failed ", cause: error}
    }

    console.log('');
    console.log( '[{PipelineExecSetStatusWatcher}] - [errorHandlerInspectPipelineExecState] [this.progressMatrix] is now :  ');
    // console.log(JSON.stringify({progressMatrix: this.progressMatrix}, null, " "));
    console.log({progressMatrix: this.progressMatrix});
    console.log('')
    throw new Error('[{PipelineExecSetStatusWatcher}] - [errorHandlerInspectPipelineExecState] CICD PROCESS INTERRUPTED BECAUSE INSPECTING PIPELINE EXEC STATE FAILED with error : [' + error + '] '+ '. Note that When failure happened, progress matrix was [' + { progressMatrix: this.progressMatrix } + ']')
  }

  private getIndexInProgressMatrixOfPipeline(ofGuid: string): number {
    let indexToReturn: number = -1;
     for (let k = 0; k < this.progressMatrix.length; k++) {
       if (this.progressMatrix[k].id === ofGuid) {
         console.log(`[{PipelineExecSetStatusWatcher}] - [getIndexInProgresMatrixOfPipeline] - Pipeline of GUID [${ofGuid}] was found in progressMatrix, its index is : [${k}]`);
         indexToReturn = k;
       }
     }
    if (indexToReturn == -1) {
      throw new Error(`[{PipelineExecSetStatusWatcher}] - [getIndexInProgresMatrixOfPipeline] - Pipeline of GUID [${ofGuid}] was not found in progressMatrix : [${this.progressMatrix}], So this CICD Stage is now stopping execution of the whole ${process.argv["cicd-stage"]} CI CD Process`);
    }
    return indexToReturn;
  }

}



/// Calculations on time spans : https://www.thetopsites.net/article/53538894.shtml
