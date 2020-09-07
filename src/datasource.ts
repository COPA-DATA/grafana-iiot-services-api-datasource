///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import {QueryType} from './constants';

export default class ServiceGridDataSource {
  id: number;
  name: string;
  url: string;
  q: any;
  uuidRegex: string = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
  
  /** @ngInject */
  constructor(instanceSettings, $q, private backendSrv, private templateSrv) {
    this.q = $q;
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;
    this.url = instanceSettings.url;
  }

  query(options) {
    
    const queries = options.targets.map(item => {
      if (item.hide)
      {
        return '';
      }
      
      return {
        refId: item.refId,
        datasourceId: item.datasourceId,
        archiveId: item.archiveId,
        variable: item.variable,
        alias: item.alias,
        queryType: item.queryType,
        alarmEventsFilter: item.alarmEventsFilter
      };
    });

    let dateFrom = <Date>options.range.from;
    let dateTo = <Date>options.range.to;

    if (queries.length === 0) {
      return Promise.resolve({ data: [] });
    }

    
    let requestsVariableValues = queries.filter(q => q.queryType === QueryType.ArchiveData);
    let requestsAlarms = queries.filter(q => q.queryType === QueryType.Alarms);
    let requestsEvents = queries.filter(q => q.queryType === QueryType.Events);
    
    let numberQueryTypes = [{type: QueryType.ArchiveData,value: requestsVariableValues.length},
      {type: QueryType.Alarms, value:requestsAlarms.length},
      {type: QueryType.Events, value:requestsEvents.length}];

    let orderedQueryTypes = numberQueryTypes.sort((a,b) => {return b.value - a.value;});

    switch(orderedQueryTypes[0].type)
    {
      case QueryType.ArchiveData:
        return this.queryVariableValues(requestsVariableValues, dateFrom, dateTo);
      case QueryType.Alarms:
        return this.queryAlarmsEvents(requestsAlarms, dateFrom, dateTo, QueryType.Alarms);
      case QueryType.Events:
        return this.queryAlarmsEvents(requestsEvents, dateFrom, dateTo, QueryType.Events);

    }

  }

  queryVariableValues(queries:any, dateFrom:Date, dateTo:Date) {

    let requests = [];
    let requestGrouped = {};
    let variableNameMapping = {};
    
    if (queries.length === 0) {
      return Promise.resolve({ data: [] });
    }

    for (let query of queries)
    {
      // ignore query for incomplete definitions
      if (query.datasourceId === undefined || query.archiveId === undefined || query.variable === undefined)
      {
        continue;
      }

      if (query.datasourceId in requestGrouped == false)
      {
        requestGrouped[query.datasourceId] = {};
      }

      if (query.archiveId in requestGrouped[query.datasourceId] == false)
      {
        requestGrouped[query.datasourceId][query.archiveId] = [];
      }

      if (requestGrouped[query.datasourceId][query.archiveId].includes(query.variable) == false)
      {
        requestGrouped[query.datasourceId][query.archiveId].push(query.variable);
      }
    
      // fill mapping between variableName and Alias
      // mapping will be unique per datasource
      if (query.datasourceId in variableNameMapping == false)
      {
        variableNameMapping[query.datasourceId] = {};
      }

      if (query.variable in variableNameMapping[query.datasourceId] == false)
      {
        variableNameMapping[query.datasourceId][query.variable] = query.alias;
      }
        
      
    }

    for (let datasourceId of Object.keys(requestGrouped))
    {
      for (let archiveId of Object.keys(requestGrouped[datasourceId]))
      {
        let requestUrl = this.url + "/api/v1/datasources/" + datasourceId + "/archives/" + archiveId + "/query";
        let variableList = requestGrouped[datasourceId][archiveId];

        let requestBody = {
          variableFilter: {
            variablenames:variableList},
            timeFilter: {
              from:dateFrom.toISOString(),
              to:dateTo.toISOString(),
              type:"Absolute"
            }
          };

        let request = this.backendSrv.datasourceRequest({
          url: requestUrl,
          data: requestBody,
          method:'POST'
        });
        
        requests.push(request);

      }
    }

    return Promise.all(requests).then((res) => {

      let varResults = [];

      // perform the mapping for each successful request
      for (let response of res)
      {
        
        if (res === undefined || !('data' in response) || !('variables' in response.data))
        {
          throw {data:{message: 'Query Error: Retrieved data has invalid format'}};
        }

        let variables = response.data.variables;

        // if no data could be found, continue with next response
        if (variables.length == 0)
        {
          continue;
        }

        // iterate through all variable entires of this response
        for (let variableEntry of variables)
        {
          let dataPoints = [];

          for (let valueEntry of variableEntry.values)
          {
              let timestamp = Date.parse(valueEntry.timestamp);
              let value = valueEntry.value;
              if (!isNaN(value))
              {
                value = Number(value);
              }
              dataPoints.push([value, timestamp]);
          }

          if ( !('archiveVariable' in variableEntry) || !('variableName' in variableEntry.archiveVariable) )
          {
            throw {data:{message: 'Query Error: Retrieved data has invalid format'}};
          }

          // find datasourceId to apply nameMapping
          let datasourceUuid = "";
          let matches = response.url.match(this.uuidRegex);
          if (matches.length >= 1) {
            datasourceUuid = matches[0];
          }

          let variableName = variableEntry.archiveVariable.variableName;
          let displayName = variableNameMapping[datasourceUuid][variableName] || variableName;

          let varResultElement = {target:displayName, datapoints: dataPoints};
          varResults.push(varResultElement);
        }

      }     
      
      // Return a resolved promise with the respective data object
      return Promise.resolve({data:varResults});

    },this.handleHttpErrors).catch(this.handleQueryException);
    
  }

  queryAlarmsEvents(queries:any, dateFrom:Date, dateTo:Date, queryType:QueryType) {

    if (queries.length === 0) {
      return Promise.resolve({ data: [] });
    }

    let requests = [];
    
    if (queries.length === 0) {
      return Promise.resolve({ data: [] });
    }
      
    for (let query of queries)
    {
      let requestUrl = this.url + "/api/v1/datasources/" + query.datasourceId;
      if (queryType == QueryType.Alarms)
        requestUrl = requestUrl + "/alarms/query";
      else if (queryType == QueryType.Events)
        requestUrl = requestUrl + "/events/query";

      let requestBody = {
        timeFilter: {
          from: dateFrom.toISOString(),
          to: dateTo.toISOString(),
          type: "Absolute"
        },
        variableFilter: {
          variableNames: [
            "*"
          ]
        }
      };

      // filtering common for alarms and events
      if (query.alarmEventsFilter !== undefined)
      {
        // overwrite variableNames if set
        requestBody.variableFilter.variableNames = [query.alarmEventsFilter.variableName || "*"];
      }

      // filtering specific for alarms
      if (query.alarmEventsFilter !== undefined && queryType == QueryType.Alarms)
      {
        let filterFlags = [];
        if (query.alarmEventsFilter.onlyActive)
          filterFlags.push("OnlyActive");
        if (query.alarmEventsFilter.onlyCleared)
          filterFlags.push("OnlyCleared");
        if (query.alarmEventsFilter.onlyUnacknowledged)
          filterFlags.push("OnlyUnacknowledged");
        if (filterFlags.length > 0)
          requestBody['filterFlags'] = filterFlags;
      }

      let request = this.backendSrv.datasourceRequest({
        url: requestUrl,
        data: requestBody,
        method:'POST'
      });
      
      requests.push(request);
    }
    
    // prepare header for table
    let alarmEventResults = {
      columns:[
      ],rows:[
      ],type:"table",};

    if (queryType == QueryType.Alarms)
    {
      alarmEventResults.columns = [
        {text:"Received Time",type:"time",sort:true,desc:true},
        {text:"Id"},
        {text:"Variable Name"},
        {text:"Value"},
        {text:"Text"},
        {text:"Comment"},
        {text:"Cleared Time",type:"time"},
        {text:"Acknowledged Time",type:"time"},
        {text:"Computer"},
        {text:"Acknowledged By"}
      ];
    } else if (queryType == QueryType.Events)
    {
      alarmEventResults.columns = [
        {text:"Received Time",type:"time",sort:true,desc:true},
        {text:"Id"},
        {text:"Variable Name"},
        {text:"Value"},
        {text:"Text"},
        {text:"Comment"},
        {text:"Computer"},
        {text:"User name"}
      ];
    }

    return Promise.all(requests).then((res) => {

      // perform the mapping for each successful request
      for (let response of res)
      {
        if (res === undefined || !('data' in response) ||
          ( queryType == QueryType.Alarms && !('alarms' in response.data) ) ||
          ( queryType == QueryType.Events && !('events' in response.data) ) )
        {
          throw {data:{message: 'Query Error: Retrieved data has invalid format'}};
        }

        let items = [];

        if ('alarms' in response.data)
          items = response.data.alarms;
        else if ('events' in response.data)
          items = response.data.events;

        // if no data could be found, continue with next response
        if (items.length == 0)
        {
          continue;
        }

        let itemRows = items.map(a => {

          switch(queryType)
          {
            case QueryType.Alarms:
              return [
                Date.parse(a.receivedTime) || null,
                a.id || null,
                a.variableName || null,
                a.value || null,
                a.text || null,
                a.comment || null,
                Date.parse(a.clearedTime) || null,
                Date.parse(a.acknowledgedTime) || null,
                a.computer || null,
                a.username || a.userFullName || null
              ];
            case QueryType.Events:
              return [
                Date.parse(a.receivedTime) || null,
                a.id || null,
                a.variableName || null,
                a.value || null,
                a.text || null,
                a.comment || null,
                a.computer || null,
                a.username || a.userFullName || null
              ];
          }

        });

        if (itemRows.length > 0)
        {
          alarmEventResults.rows = alarmEventResults.rows.concat(itemRows);
        }
      }

      // return empty result if no data could be found
      if (alarmEventResults.rows.length == 0)
      {
        return Promise.resolve({data:[]});
      }

      // Return a resolved promise with the respective alarm objects
      return Promise.resolve({data:[alarmEventResults]});

    },this.handleHttpErrors).catch(this.handleQueryException);

  }

  annotationQuery(options) {
    
  }

  findDataSources(query: string) {

    return this.backendSrv.datasourceRequest({
      url: this.url + "/api/v1/datasources",
      method:'GET'
    }).then((res) => {

      let datasources = [];

      if (!("dataSources" in res.data))
      {
        throw {data:{message: "Query Error: Could not parse list of data sources"}};
      }

      let responseDataSources = res.data.dataSources;

      if (responseDataSources === undefined || responseDataSources instanceof Array == false)
      {
        throw {data:{message: "Query Error: Could not parse list of data sources"}};
      }

      for (let ds of responseDataSources)
      {
        if (!('dataSourceId' in ds) || !('name' in ds))
        {
          throw {data:{message: "Query Error: Unknown/Invalid format"}};
        }

        let dsObj = {"text": ds.name, "value":ds.dataSourceId};
        datasources.push(dsObj);
      }
      
      datasources.sort((a,b) => (a.text > b.text) ? 1 : -1);

      return Promise.resolve(datasources);

    },(err:any) => {
      return Promise.resolve([]);
    });

  }

  findArchives(datasourceId: string, query: string) {

    return this.backendSrv.datasourceRequest({
      url: this.url + "/api/v1/datasources/" + datasourceId + "/archives",
      method:'GET'
    }).then((res) => {

      let archives = [];

      if (!("archives" in res.data))
      {
        throw {data:{message: "Query Error: Could not parse list of archives"}};
      }

      let responseArchives = res.data.archives;

      if (responseArchives === undefined || responseArchives instanceof Array == false)
      {
        throw {data:{message: "Query Error: Could not parse list of archives"}};
      }

      let extractArchives = (archiveArray: [any], isAggregated:boolean) => {
        for (let arch of archiveArray)
        {
          if (!('identification' in arch) || !('name' in arch))
          {
            throw {data:{message: "Query Error: Unknown/Invalid format"}};
          }
  
          let displayName = (isAggregated ? "- aggregated - " : "") + arch.name;
          let archObj = {"text": displayName, "value":arch.identification};
          archives.push(archObj);

          if ('aggregatedArchives' in arch)
          {
            extractArchives(arch.aggregatedArchives, true);
          }
        }
      };

      extractArchives(responseArchives, false);
      
      // sort archives, ignore prefix "AGGREGATED: "
      archives.sort((a,b) => {
        return (a.text.replace(/- aggregated - /,'') > b.text.replace(/- aggregated - /,'')) ? 1 : -1;
      });

      return Promise.resolve(archives);

    },(err:any) => {
      return Promise.resolve([]);
    });

  }


  findVariablesForArchive(datasourceId: string, archiveId: string, query: string) {

    return this.backendSrv.datasourceRequest({
      url: this.url + "/api/v1/datasources/" + datasourceId + "/archives/" + archiveId,
      method:'GET'
    }).then((res) => {

      if (!("variables" in res.data))
      {
        throw {data:{message: "Query Error: Could not parse list of variables"}};
      }

      let responseVariables = res.data.variables;

      if (responseVariables === undefined || responseVariables instanceof Array == false)
      {
        throw {data:{message: "Query Error: Could not parse list of variables"}};
      }

      const variables = responseVariables.map(item => {      
        return {text: item.variableName, value: item.variableName};
      });

      variables.sort((a,b) => (a.text > b.text) ? 1 : -1);

      return Promise.resolve(variables);

    },(err:any) => {
      return Promise.resolve([]);
    });

  }


  findVariables(datasourceId: string, query: string) {

    let requestUrl = this.url + "/api/v1/datasources/" + datasourceId + "/variables/query";
    let requestBody = {fields: ["name"],nameFilter:{variableNames:["*"]}};

    return this.backendSrv.datasourceRequest({
      url: requestUrl,
      data: requestBody,
      method:'POST'
    }).then((res) => {

      if (!("variables" in res.data))
      {
        throw {data:{message: "Query Error: Could not parse list of variables"}};
      }

      let variables = res.data.variables.map(v => {
        return {text: v.name, value: v.name};
      });

      variables.sort((a,b) => (a.text > b.text) ? 1 : -1);

      return Promise.resolve(variables);

    },(err:any) => {
      return Promise.resolve([]);
    });

  }
  
  testDatasource() {
    
    return this.backendSrv.datasourceRequest({
      url: this.url + "/",
      method:'GET'
    }).then((data) =>{
      return Promise.resolve({
        status: 'success',
        message: 'Connection test successful',
      });
    },(err:any) => {
      return Promise.resolve({
        status: 'error',
        message: 'Error: ' + err.status + ' ' + err.statusText,
      });

    });
  }

  handleHttpErrors(err:any) {
    
    if (err.status === 401)
    {
      err.message = "Authorization Error: " + err.status + " Unauthorized";
    }

    return Promise.reject(err);
  }

  handleQueryException(err:any) {
    if ( ('data' in err) && err.data !== undefined)
    {
      return Promise.reject(err);
    }

    // return a rejected promise with the error message
    return Promise.reject({data:{
      message: 'Query Error: Error during requesting data from API'
    }});
  }

}
