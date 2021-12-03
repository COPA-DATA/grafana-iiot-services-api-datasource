import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MetricFindValue,
  MutableDataFrame,
  ScopedVars,

} from '@grafana/data';

import { DataSourceQuery, SGApiDataSourceOptions, DataSourceQueryType, TemplateVariableQuery, TemplateVariableQueryType, DataOrigin } from './types';

import { getBackendSrv, getTemplateSrv } from "@grafana/runtime"

export class DataSource extends DataSourceApi<DataSourceQuery, SGApiDataSourceOptions> {
  url: string;
  showOfflineDatasources: boolean;

  constructor(instanceSettings: DataSourceInstanceSettings<SGApiDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url!;
    this.showOfflineDatasources = instanceSettings.jsonData.showOfflineDatasources || false;
  }

  async query(options: DataQueryRequest<DataSourceQuery>): Promise<DataQueryResponse> {

    let queries: DataSourceQuery[] = options.targets.filter(item => item.hide != true);
    queries.forEach(item => {
      item = this.replaceTemplateVariables(item, options.scopedVars);
    });

    let dateFrom: Date = <Date><unknown>options.range.from;
    let dateTo: Date = <Date><unknown>options.range.to;

    if (queries.length === 0) {
      return Promise.resolve({ data: [] });
    }

    let runningQueries = [];

    for (let query of queries) {
      // is query valid?
      if (!query.datasourceId || (query.queryType==DataSourceQueryType.ArchiveData && (!query.archiveFilter.archiveId || query.archiveFilter.variables.length==0)))
      {
        continue;
      }
      switch (query.queryType) {
        case DataSourceQueryType.ArchiveData:
          runningQueries.push(this.queryArchiveValues(query, dateFrom, dateTo));
          break;
        case DataSourceQueryType.Alarms:
        case DataSourceQueryType.Events:
          runningQueries.push(this.queryAlarmsEvents(query, dateFrom, dateTo))
          break;
        case DataSourceQueryType.VariableValues:
          runningQueries.push(this.queryOnlineValues(query));
      }
    }

    return Promise.all(runningQueries).then((dataFrames) => {

      return Promise.resolve({data:dataFrames.flat()})
    })
  }

  replaceTemplateVariables(query:DataSourceQuery, scopedVars:ScopedVars) : DataSourceQuery
  {
    
    query.datasourceId = getTemplateSrv().replace(query.datasourceId, scopedVars);
    query.archiveFilter.archiveId = getTemplateSrv().replace(query.archiveFilter.archiveId, scopedVars);

    const expandTemplateVars = (array:string[]): string[] =>{
      let result : string[] = [];
      for (let v of array)
      {
        let value = getTemplateSrv().replace(v, scopedVars);
        // is this a multi-value variable
        if (value.substr(0,2) == '["')
        {
          result = result.concat(JSON.parse(value));
        }
        else
        {
            result.push(value.replace(/['"]+/g, ''));
        }
      }
      return result;
    }
    
    query.archiveFilter.variables=expandTemplateVars(query.archiveFilter.variables);
    query.alarmsEventsFilter.variables=expandTemplateVars(query.alarmsEventsFilter.variables);
    query.variableFilter.variables=expandTemplateVars(query.variableFilter.variables);
    return query;
  }

  async metricFindQuery(query: TemplateVariableQuery, options?: any) : Promise<MetricFindValue[]>{
    
    // Currently grafana does not support filtering variables by their labels.
    // Since this is an important usecase for us, we will (for now) not use the
    // 'label' property of MetricFindValue.
    // Instead we return a string in the 'text' property in the form <DisplayName> | <value>
    // That way we can use regex capture groups in grafanas filter to create label and text props
    // Example: Catch only projects that start with "FNB": (?<text>FNB.+) \| (?<value>[\da-z\-]+)

    let regex = new RegExp("");
    try {
      regex = new RegExp(query.regexString, "i");
    } catch (e) {
      console.error(query.regexString + " has invalid regex pattern. Ignore regex filter.");
    }

    switch(query.queryType)
    {
      case TemplateVariableQueryType.Datasources:
        return this.findDataSources().then((ds) => {
          let items = [];
          for (let d of ds){
            
            if (d.label.match(regex) == null){
              console.debug(d.label + " does not match regex " + regex);
              continue;
            }

            items.push({text:d.label,value:d.value})

          }
          return Promise.resolve(items);
        });
      break;
      case TemplateVariableQueryType.ArchivesForDatasource:
        return this.findArchives(query.datasourceId!).then((ars) => {
          let items = [];
          for (let d of ars){

            if (d.label.match(regex) == null){
              console.debug(d.label + " does not match regex " + regex);
              continue;
            }

            items.push({text:d.label,value:d.value})

          }
          return Promise.resolve(items);
        });
      break;
      case TemplateVariableQueryType.VariablesForArchive:
        return this.findVariablesForArchive(query.datasourceId!,query.archiveId!).then((vars) => {
          let items = [];
          for (let d of vars){

            if (d.label.match(regex) == null){
              console.debug(d.label + " does not match regex " + regex);
              continue;
            }

            items.push({text:d.label,value:d.value})
            
          }
          return Promise.resolve(items);
        });
        break;
        case TemplateVariableQueryType.VariablesForDatasource:
        return this.findVariables(query.datasourceId!).then((vars) => {
          let items = [];
          for (let d of vars){

            if (d.label.match(regex) == null){
              console.debug(d.label + " does not match regex " + regex);
              continue;
            }

            items.push({text:d.label,value:d.value})
            
          }
          return Promise.resolve(items);
        });
        break;
    }
  }

  async testDatasource() {

    return getBackendSrv().datasourceRequest({
      url: this.url + "/",
      method: 'GET'
    }).then((data: any) => {
      return Promise.resolve({
        status: 'success',
        message: 'Connection test successful',
      });
    }, (err: any) => {
      return Promise.resolve({
        status: 'error',
        message: 'Error: ' + err.status + ' ' + err.statusText,
      });

    });
  }

  queryArchiveValues(query: DataSourceQuery, dateFrom: Date, dateTo: Date): Promise<MutableDataFrame[]> {

    let requestUrl = this.url + "/api/v2/datasources/" + query.datasourceId + "/archives/" + query.archiveFilter.archiveId + "/query";
    let variableList = query.archiveFilter.variables;
    let requestBody = {
      variableFilter: {
        variableNames: variableList
      },
      timeFilter: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        type: "Absolute"
      },
      origin: query.archiveFilter.origin
    };

    return getBackendSrv().datasourceRequest({
      url: requestUrl,
      data: requestBody,
      method: 'POST'
    }).then((response) => {

      if (!('data' in response) || !('variables' in response.data)) {
        throw { data: { message: 'Query Error: Retrieved data has invalid format' } };
      }

      let variables = response.data.variables;

      let dataFrames = []

      // iterate through all variable entries of this response
      for (let variableEntry of variables) {

        const dataFrame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: variableEntry.archiveVariable.variableName, type: FieldType.number},
            { name: 'time', type: FieldType.time }
          ],
        });

        for (let valueEntry of variableEntry.values) {
          let timestamp = Date.parse(valueEntry.timestamp);
          let value = valueEntry.value;
          if (!isNaN(value)) {
            value = Number(value);
          }
          dataFrame.add({
            time: timestamp,
            [variableEntry.archiveVariable.variableName]: value
          });
        }

        if (!('archiveVariable' in variableEntry) || !('variableName' in variableEntry.archiveVariable)) {
          throw { data: { message: 'Query Error: Retrieved data has invalid format' } };
        }
        dataFrames.push(dataFrame)        
      }

      return Promise.resolve(dataFrames);

    }, this.handleHttpErrors).catch(this.handleQueryException);

  }

  queryOnlineValues(query: DataSourceQuery): Promise<MutableDataFrame[]> {

    let requestUrl = this.url + "/api/v1/datasources/" + query.datasourceId + "/variables/query";
    let variableList = query.variableFilter.variables;

    let requestBody = {
      nameFilter: {
        variableNames: variableList
      },
      fields: ["name","value","lastUpdateTime"]
    };

    return getBackendSrv().datasourceRequest({
      url: requestUrl,
      data: requestBody,
      method: 'POST'
    }).then((response) => {

      if (!('data' in response) || !('variables' in response.data)) {
        throw { data: { message: 'Query Error: Retrieved data has invalid format' } };
      }

      let variables = response.data.variables;
      
      let dataFrames = []

      // iterate through all variable entries of this response
      for (let variableEntry of variables) {

        const dataFrame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: variableEntry.name, type: FieldType.number},
            { name: 'time', type: FieldType.time }
          ],
        });

        dataFrame.add({
          time: variableEntry.lastUpdateTime,
          [variableEntry.name]: variableEntry.value
        });

        dataFrames.push(dataFrame);
      }

      return Promise.resolve(dataFrames);

    }, this.handleHttpErrors).catch(this.handleQueryException);

  }

  queryAlarmsEvents(query: DataSourceQuery, dateFrom: Date, dateTo: Date) : Promise<MutableDataFrame[]> {

    let requestUrl = this.url + "/api/v1/datasources/" + query.datasourceId;
    if (query.queryType == DataSourceQueryType.Alarms)
      requestUrl = requestUrl + "/alarms/query";
    else if (query.queryType == DataSourceQueryType.Events)
      requestUrl = requestUrl + "/events/query";

    let requestBody: any = {
      timeFilter: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        type: "Absolute"
      },
      variableFilter: {
        variableNames: query.alarmsEventsFilter.variables
      }
    }
    
    // filtering specific for alarms
    if (query.alarmsEventsFilter !== undefined && query.queryType == DataSourceQueryType.Alarms) {
      let filterFlags: any[] = [];
      if (query.alarmsEventsFilter.onlyActive)
        filterFlags.push("OnlyActive");
      if (query.alarmsEventsFilter.onlyCleared)
        filterFlags.push("OnlyCleared");
      if (query.alarmsEventsFilter.onlyUnacknowledged)
        filterFlags.push("OnlyUnacknowledged");
      if (filterFlags.length > 0)
        requestBody['filterFlags'] = filterFlags;
    }

    return getBackendSrv().datasourceRequest({
      url: requestUrl,
      data: requestBody,
      method: 'POST'
    }).then((response) => {

      if (!('data' in response) ||
        (query.queryType == DataSourceQueryType.Alarms && !('alarms' in response.data)) ||
        (query.queryType == DataSourceQueryType.Events && !('events' in response.data))) {
        throw { data: { message: 'Query Error: Retrieved data has invalid format' } };
      }

      let items = [];

      if ('alarms' in response.data)
        items = response.data.alarms;
      else if ('events' in response.data)
        items = response.data.events;

      let dataFrame = undefined;

      switch (query.queryType) {
        default:
        case DataSourceQueryType.Alarms:
          const alarmsDataFrame = new MutableDataFrame({
            refId: query.refId,
            fields: [
              { name: 'id', type: FieldType.string, config: { displayName: 'Id' } },
              { name: 'variableName', type: FieldType.string, config: { displayName: 'Variable Name' } },
              { name: 'value', type: FieldType.other, config: { displayName: 'Value' } },
              { name: 'text', type: FieldType.string, config: { displayName: 'Text' } },
              { name: 'comment', type: FieldType.string, config: { displayName: 'Comment' } },
              { name: 'receivedTime', type: FieldType.time, config: { displayName: 'Time Received' } },
              { name: 'clearedTime', type: FieldType.time, config: { displayName: 'Time Cleared' } },
              { name: 'acknowledgedTime', type: FieldType.time, config: { displayName: 'Time Acknowledged' } },
              { name: 'computer', type: FieldType.string, config: { displayName: 'Computer' } },
              { name: 'acknowledgedBy', type: FieldType.string, config: { displayName: 'Acknowledged by' } },
            ]
          })

          for (let item of items) {
            alarmsDataFrame.add({
              id: item.id || null,
              variableName: item.variableName || null,
              value: item.value || null,
              text: item.text || null,
              comment: item.comment || null,
              receivedTime: Date.parse(item.receivedTime) || null,
              clearedTime: Date.parse(item.clearedTime) || null,
              acknowledgedTime: Date.parse(item.acknowledgedTime) || null,
              computer: item.computer || null,
              acknowledgedBy: item.username || item.userFullName || null
            })
          }

          dataFrame = alarmsDataFrame;
          break;

        case DataSourceQueryType.Events:
          const eventsDataFrame = new MutableDataFrame({
            refId: query.refId,
            fields: [
              { name: 'id', type: FieldType.string, config: { displayName: 'Id' } },
              { name: 'variableName', type: FieldType.string, config: { displayName: 'Variable Name' } },
              { name: 'value', type: FieldType.other, config: { displayName: 'Value' } },
              { name: 'text', type: FieldType.string, config: { displayName: 'Text' } },
              { name: 'comment', type: FieldType.string, config: { displayName: 'Comment' } },
              { name: 'receivedTime', type: FieldType.time, config: { displayName: 'Time Received' } },
              { name: 'computer', type: FieldType.string, config: { displayName: 'Computer' } },
              { name: 'user', type: FieldType.string, config: { displayName: 'User' } },
            ]
          })

          for (let item of items) {
            eventsDataFrame.add({
              id: item.id || null,
              variableName: item.variableName || null,
              value: item.value || null,
              text: item.text || null,
              comment: item.comment || null,
              receivedTime: Date.parse(item.receivedTime) || null,
              computer: item.computer || null,
              user: item.username || item.userFullName || null
            })
          }

          dataFrame = eventsDataFrame;
          break;
      }

      return Promise.resolve([dataFrame]);

    }, this.handleHttpErrors).catch(this.handleQueryException);

  }

  findDataSources() : Promise<{label:string,value:string}[]> {

    return getBackendSrv().datasourceRequest({
      url: this.url + "/api/v2/datasources",
      method: 'GET'
    }).then((res: any) => {

      let datasources = [];

      if (!("dataSourcesOrigin" in res.data)) {
        throw { data: { message: "Query Error: Could not parse list of data sources" } };
      }

      let responseDataSources = res.data.dataSourcesOrigin;

      if (responseDataSources === undefined || responseDataSources instanceof Array == false) {
        throw { data: { message: "Query Error: Could not parse list of data sources" } };
      }

      for (let ds of responseDataSources) {
        if (!('dataSourceId' in ds) || !('name' in ds) || !('dataOrigin' in ds)) {
          throw { data: { message: "Query Error: Unknown/Invalid format" } };
        }

        // ignore datasources where none of the data origins (Data Storage or Serivce Engine) is currently available
        // only do so if the respective datasource wide setting is not configured
        let dataOrigins = ds.dataOrigin as [{type: string, state: string}];
        if (dataOrigins.filter(d => d.state == "Available").length == 0 && !this.showOfflineDatasources) {
          continue;
        }

        let dsObj = { "label": ds.name, "value": ds.dataSourceId };
        datasources.push(dsObj);
      }

      datasources.sort((a, b) => (a.label > b.label) ? 1 : -1);

      return Promise.resolve(datasources);

    }, this.handleHttpErrors).catch(this.handleQueryException);

  }

  findArchives(datasourceId: string, dataorigin: DataOrigin = DataOrigin.DataStorage) : Promise<{label:string,value:string}[]> {

    if (datasourceId == undefined || datasourceId == '') {
      return Promise.resolve([]);
    }

    datasourceId = getTemplateSrv().replace(datasourceId);

    return getBackendSrv().datasourceRequest({
      url: this.url + "/api/v2/datasources/" + datasourceId + "/archives",
      method: 'GET'
    }).then((res) => {

      let archives: any[] = [];

      if (!("archives" in res.data)) {
        throw { data: { message: "Query Error: Could not parse list of archives" } };
      }

      let responseArchives = res.data.archives;

      if (responseArchives === undefined || responseArchives instanceof Array == false) {
        throw { data: { message: "Query Error: Could not parse list of archives" } };
      }

      let extractArchives = (archiveArray: [any], isAggregated: boolean) => {
        for (let arch of archiveArray) {
          if (!('identification' in arch) || !('name' in arch)) {
            throw { data: { message: "Query Error: Unknown/Invalid format" } };
          }

          let displayName = (isAggregated ? "- aggregated - " : "") + arch.name;
          let archObj = { "label": displayName, "value": arch.identification };
          
          // only include the archive in the list, if it is available in the selected data origin
          if ((<string[]>arch.dataOrigin).indexOf(dataorigin) != -1)
          {
            archives.push(archObj);
          }

          if ('aggregatedArchives' in arch) {
            extractArchives(arch.aggregatedArchives, true);
          }
        }
      };

      extractArchives(responseArchives, false);

      // sort archives, ignore prefix "AGGREGATED: "
      archives.sort((a, b) => {
        return (a.label.replace(/- aggregated - /, '') > b.label.replace(/- aggregated - /, '')) ? 1 : -1;
      });

      return Promise.resolve(archives);

    },(err:any) => {
      return Promise.resolve([]);
    });

  }

  findVariablesForArchive(datasourceId: string, archiveId: string) : Promise<{label:string,value:string}[]> {

    if (datasourceId == undefined || datasourceId == '' || archiveId == undefined || archiveId == '') {
      return Promise.resolve([]);
    }

    datasourceId = getTemplateSrv().replace(datasourceId);
    archiveId = getTemplateSrv().replace(archiveId);

    return getBackendSrv().datasourceRequest({
      url: this.url + "/api/v2/datasources/" + datasourceId + "/archives/" + archiveId,
      method: 'GET'
    }).then((res) => {

      if (!("variables" in res.data)) {
        throw { data: { message: "Query Error: Could not parse list of variables" } };
      }

      let responseVariables = res.data.variables;

      if (responseVariables === undefined || responseVariables instanceof Array == false) {
        throw { data: { message: "Query Error: Could not parse list of variables" } };
      }

      const variables = responseVariables.map((item: any) => {
        return { label: item.variableName, value: item.variableName };
      });

      variables.sort((a: any, b: any) => (a.label > b.label) ? 1 : -1);

      return Promise.resolve(variables);

    }, this.handleHttpErrors).catch(this.handleQueryException);

  }

  findVariables(datasourceId: string) : Promise<{label:string,value:string}[]>{

    if (datasourceId == undefined || datasourceId == '') {
      return Promise.resolve([]);
    }

    datasourceId = getTemplateSrv().replace(datasourceId);

    let requestUrl = this.url + "/api/v1/datasources/" + datasourceId + "/variables/query";
    let requestBody = { fields: ["name"], nameFilter: { variableNames: ["*"] } };

    return getBackendSrv().datasourceRequest({
      url: requestUrl,
      data: requestBody,
      method: 'POST'
    }).then((res) => {

      if (!("variables" in res.data)) {
        throw { data: { message: "Query Error: Could not parse list of variables" } };
      }

      let variables = res.data.variables.map((v: any) => {
        return { label: v.name, value: v.name };
      });

      variables.sort((a: any, b: any) => (a.label > b.label) ? 1 : -1);

      return Promise.resolve(variables);

    }, this.handleHttpErrors).catch(this.handleQueryException);

  }

  handleHttpErrors(err: any) {

    if (err.status === 401) {
      err.message = "Authorization Error: " + err.status + " Unauthorized";
    }

    if (err.status == 400) {
      if (err.data !== undefined && err.data.errorMessage !== undefined && err.data.variableErrors !== undefined)
      {
        err.message = "Bad Request: " + err.data.errorMessage + "; Details: " + JSON.stringify(err.data.variableErrors);
      } else {
        err.message = "Bad Request";
      }
    }

    if (err.data !== undefined && err.data.errorMessage !== undefined) {
      err.message = err.data.errorMessage;
    }

    throw new Error(err.message);

    return Promise.reject(err);
  }

  handleQueryException(err: any) {
    if (('data' in err) && err.data !== undefined) {
      return Promise.reject(err);
    }

    // return a rejected promise with the error message
    return Promise.reject({
      data: {
        message: 'Query Error: Error during requesting data from API. ' + err.message
      }
    });
  }

}
