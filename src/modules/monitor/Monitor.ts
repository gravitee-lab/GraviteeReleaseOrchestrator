// RxJS v6+
import * as rxjs from 'rxjs';
import { map, tap, retryWhen, delayWhen,delay,take } from 'rxjs/operators';
import axios from 'axios';
import {AxiosResponse} from 'axios';
import * as parallel from '../../modules/monitor/ParallelExecutionSetProgress';
import * as giocomponents from '../manifest/GraviteeComponent';
/// import * as Collections from 'typescript-collections';

export namespace monitoring {


  export interface FetchResult {
     httpCode: number;
     JSONresponse: any; // the resulting JSON Response from the fetched API
  }


  export interface MonitorArgs  {
    parallelExecutionSetProgress: parallel.ParallelExecutionSetProgress;
    timeout: number;
  }

  /**
   *
   *
   **/
  export class Monitor {

    public readonly parallelExecutionSetProgress: parallel.ParallelExecutionSetProgress;

    /**
     * Timeout for the execution of this module
     **/
    public readonly timeout: number;

    constructor (
      name: string,
      args: MonitorArgs
    ) {
      /**
       * Monitor subscribes to all crated ObservableStreams
       * for all Circle CI v2 invocations to trigger all pipeline executions
       **/
      this.subscribeToAllTriggers();
      this.timeout = args.timeout;
    }
  private subscribeToAllTriggers() : void {
    let arrayLength = this.parallelExecutionSetProgress.pipeline_executions.length;
    for (let i: number; i < arrayLength ; i++){
      this.parallelExecutionSetProgress.pipeline_executions[i].execution.observableRequest.subscribe({
          next: this.handleTriggerPipelineCciResponse.bind(this),
          complete: (data) => {
            console.log( '[{[CircleCiOrchestrator]} - triggering Circle CI Build completed! :)]')
          },
          error: this.handleTriggerPipelineCciResponseError.bind(this)
      });
    }

  }
  /**
   * This method is there to serve as handler method for the <strong>Circle CI </strong> API call that trigger <strong>Circle CI <strong> Pipeline :
   * Every time this method is invoked, it adds an entry  in the {@see this.progressMatrix}, from the <pre>data</pre> returned by the <strong>Circle CI</strong> API call
   * then, the {@see this.progressMatrix}
   *
   *
   * @argument data A JSOn Object returned by the Circle CI API as Response of a Pipeline trigger
   * -----
   * <pre>
   * {
   *
   *    "number": "17",
   *    "id": "c08fe570-a3ea-4232-9ed8-432ed65921a1",
   *    "state": "pending",
   *    "created_at": "2020-08-16T18:18:01.891Z"
   *
   *  }
   * </pre>
   * -----
   *
   *
   **/
  private handleTriggerPipelineCciResponse (circleCiJsonResponse: any, component: giocomponents.GraviteeComponent) : void {
    console.info( '[{CircleCiOrchestrator}] - [handleTriggerPipelineCciResponse] Processing Circle CI API Response [data] => ', circleCiJsonResponse )
    /**
     * CircleCiApiTriggerPipelineResponse
     **/
    this.parallelExecutionSetProgress.updatePipelineExecution(component, circleCiJsonResponse);
  }

  private handleTriggerPipelineCciResponseError (error: any) : void {
    console.info( '[{CircleCiOrchestrator}] - Triggering Circle CI pipeline failed Circle CI API Response [data] => ', error )
    let entry: any = {};
    entry.pipeline = {
      execution_index: null,
      id : null,
      created_at: null,
      exec_state: null,
      error : {message: "[{CircleCiOrchestrator}] - Triggering Circle CI pipeline failed ", cause: error}
    }

    this.progressMatrix.push(entry);

    console.info('')
    console.info( '[{CircleCiOrchestrator}] - [handleTriggerPipelineCircleCIResponseData] [this.progressMatrix] is now :  ');
    console.info(JSON.stringify({progressMatrix: this.progressMatrix}))
    console.info('')
  }


  public fetch (): rxjs.Observable<AxiosResponse<any>> {

          //emit fetch result every 1s
          //emit value every 1s
          //emit value every 1s
          const source = rxjs.from(axios.get(`${this.rest_endpoint}`)).pipe(
          tap(val => console.log(`fetching ${this.rest_endpoint} which you won't see `)),)
          const response$ = source.pipe(
            map(axiosResponse => {
              if (!(axiosResponse.status == 200 || axiosResponse.status == 201 || axiosResponse.status == 203)) {
                //error will be picked up by retryWhen
                throw axiosResponse;
              }
              return axiosResponse; /// return value  HTTP Response Code si 200
            }),
            retryWhen(errors =>
              errors.pipe(
                //log error message
                tap(axiosResponse => {
                  console.log(`Error occured, trying to fetch [${this.rest_endpoint}], HTTP Response is : `);
                  console.log(`Error occured, trying to fetch [${JSON.stringify(axiosResponse.data)}], now retrying`);
                  console.log(`Error occured, trying to fetch [${this.rest_endpoint}], now retrying`);

                }),
                //restart in 5 seconds
                delay(2000), /// wait 2 seconds before retrying
                /// delayWhen(val => timer(val * 1000)),
                /// delayWhen(val => rxjs.timer(7 * 1000)), /// wait 7 seconds before retrying
                take(5)
              )
            )
          );

          return response$;

    }
    // perfect test is :
    // curl -X DELETE https://auth-nightly.gravitee.io/management/organizations/DEFAULT/environments/DEFAULT/domains/dine
    // {"message":"No JWT token found","http_status":401}
    public demoRetryWhen (): rxjs.Observable<AxiosResponse<any>> {

            const source = rxjs.from(axios.delete(`${this.rest_endpoint}`)).pipe(
            tap(val => console.log(`fetching ${this.rest_endpoint} which you won't see `)))
            const response$ = source.pipe(
              map(axiosResponse => {
                if (!(axiosResponse.status == 200 || axiosResponse.status == 201 || axiosResponse.status == 203)) {
                  //error will be picked up by retryWhen
                  console.log(` Fetch Response' request is : [${axiosResponse.request}], `);
                  console.log(` HTTP status is : [${axiosResponse.statusText}], `);
                  console.log(` AxiosResponse config is [${axiosResponse.config}]`);

                  throw axiosResponse;
                }
                return axiosResponse; /// return value  HTTP Response Code si 200
              }),
              retryWhen(errors =>
                errors.pipe(
                  //log error message
                  tap(axiosResponse => {
                    console.log(`What is passed on to tap >>  [${JSON.stringify(axiosResponse,null,2)}],`);
                    console.log(`now retrying`);

                  }),
                  //restart in 5 seconds
                  delay(2000), /// wait 2 seconds before retrying
                  /// delayWhen(val => timer(val * 1000)),
                  /// delayWhen(val => rxjs.timer(7 * 1000)), /// wait 7 seconds before retrying
                  take(5)
                )
              )
            );

            return response$;

      }
  }

}
