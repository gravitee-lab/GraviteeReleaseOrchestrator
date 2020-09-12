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

  export namespace subscribers {

      interface ICciApiSubscriberNext {
        (data: any): void;
      }

      interface ICciApiSubscriberComplete {
        (data: any): void;
      }

      interface ICciApiSubscriberError {
        (error: any): void;
      }

      export interface ICciApiSubscriber {
        next: ICciApiSubscriberNext, /// method with signature (data: any) => {}
        complete: ICciApiSubscriberComplete,/// method with signature (data: any) => {}
        error: ICciApiSubscriberError /// method with signature (error: any) => {}
      }

      export class CciApiPipelineStatusSubscriber implements ICciApiSubscriber {
        /// public readonly pipelineExecution: parallel.PipelineExecutionTrigger;
        public readonly pipelineStatus: parallel.PipelineStatus;

        constructor (
          somePipelineExecution: parallel.PipelineExecutionTrigger
        ) {
           this.pipelineStatus = somePipelineExecution;
           // immediately subscribes to Circle CI API HTTP request to check Pipeline Status 's observableRequest (which is an RxJS {@see ObservableStream} )
           this.pipelineStatus.execution.observableRequest.subscribe(this);
        }
        public next (theCci_Api_response: any) : void {
          console.log( '[{[Monitor]} - querying Circle CI API to check Pipeline Status : response received ! (below received Circle CI answer) :)]')
          console.log( JSON.stringify(theCci_Api_response, null, " "));
          this.pipelineStatus.execution.cci_response = theCci_Api_response;
        }
        public complete(theCci_Api_response: any) : void {
          console.log( '[{[Monitor]} - querying Circle CI API to check Pipeline Status completed! (below received Circle CI answer) :)]')
          console.log( JSON.stringify(theCci_Api_response, null, " "));
        }
        public error(theCci_Api_error: any) : void { // handleTriggerPipelineCciResponseError
          console.log( '[{[Monitor]} -  querying Circle CI API to check Pipeline Status returned HTTP error! :o  (below received Circle CI answer)]')
          console.log( JSON.stringify(theCci_Api_error, null, " "));
          this.pipelineStatus.execution.error = theCci_Api_error;
        }
      }
      /**
       * Used to Subscribe to the ObservableStream for each Circle CI API invocation
       * to trigger a pipeline execution
       **/
      export class CciApiTriggerPipelineSubscriber implements ICciApiSubscriber {

        public readonly pipelineExecution: parallel.PipelineExecutionTrigger;
        constructor (
          somePipelineExecution: parallel.PipelineExecutionTrigger
        ) {
           this.pipelineExecution = somePipelineExecution;
           // immediately subscribes to PipelineExecution 's observableRequest (which is an RxJS {@see ObservableStream} )
           this.pipelineExecution.execution.observableRequest.subscribe(this);
        }
        public next (theCci_Api_response: any) : void {
          console.log( '[{[Monitor]} - triggering Circle CI Pipeline : response received ! (below received Circle CI answer) :)]')
          console.log( JSON.stringify(theCci_Api_response, null, " "));
          this.pipelineExecution.execution.cci_response = theCci_Api_response;
        }
        public complete(theCci_Api_response: any) : void {
          console.log( '[{[Monitor]} - triggering Circle CI Pipeline completed! (below received Circle CI answer) :)]')
          console.log( JSON.stringify(theCci_Api_response, null, " "));
        }
        public error(theCci_Api_error: any) : void { // handleTriggerPipelineCciResponseError
          console.log( '[{[Monitor]} - triggering Circle CI Pipeline returned HTTP error :o ! (below received HTTP error) ]')
          console.log( JSON.stringify(theCci_Api_error, null, " "));
          this.pipelineExecution.execution.error = theCci_Api_error;
        }

      }

    } // end of [subscribers] namespace



  /**
   *
   *
   **/
  export class Monitor {

    public readonly parallelExecutionSetProgress: parallel.ParallelExecutionSetProgress;
    public readonly triggerSubscribers: monitoring.subscribers.CciApiTriggerPipelineSubscriber[];
    public readonly statusSubscribers: monitoring.subscribers.CciApiPipelineStatusSubscriber[];
    /**
     * Set to <code>true</code> as soon as this PipelineExecution has completed, regardless of pipeline execution final status (failure/success, etc...)
     **/
    public readonly completed: boolean;
    /**
     * Timeout for the execution of this module
     **/
    public readonly timeout: number;

    constructor (
      name: string,
      args: monitoring.MonitorArgs
    ) {
      /**
       * Monitor subscribes to all crated ObservableStreams
       * for all Circle CI v2 invocations to trigger all pipeline executions
       **/
      this.timeout = args.timeout; // unsued yet
      this.triggerSubscribers = [];
      this.statusSubscribers = [];
      this.initSubscribers();
    }

    private initSubscribers() : void {
      let arrayLength = this.parallelExecutionSetProgress.pipeline_executions.length;
      for (let i: number; i < arrayLength ; i++){
        // create a new Subscriber which immediately subscribes to PipelineExecution 's observableRequest
        let thisSubscriber = new monitoring.subscribers.CciApiTriggerPipelineSubscriber(this.parallelExecutionSetProgress.pipeline_executions[i]);
        // keep a reference over the new subscriber
        this.triggerSubscribers.push(thisSubscriber);
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
    public fetch (): rxjs.Observable<AxiosResponse<any>> {
            const demo_rest_endpoint: string = "https://auth-nightly.gravitee.io/management/organizations/DEFAULT/environments/DEFAULT/domains/dine"
            //emit fetch result every 1s
            //emit value every 1s
            //emit value every 1s
            const source = rxjs.from(axios.get(`${demo_rest_endpoint}`)).pipe(
            tap(val => console.log(`fetching ${demo_rest_endpoint} which you won't see `)),)
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
                    console.log(`Error occured, trying to fetch [${demo_rest_endpoint}], HTTP Response is : `);
                    console.log(`Error occured, trying to fetch [${JSON.stringify(axiosResponse.data)}], now retrying`);
                    console.log(`Error occured, trying to fetch [${demo_rest_endpoint}], now retrying`);

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
            const demo_rest_endpoint: string = "https://auth-nightly.gravitee.io/management/organizations/DEFAULT/environments/DEFAULT/domains/dine"
            const source = rxjs.from(axios.delete(`${demo_rest_endpoint}`)).pipe(
            tap(val => console.log(`fetching ${demo_rest_endpoint} which you won't see `)))
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
