import { DataQuery, DataSourceJsonData } from '@grafana/data';

export enum QueryType {
  ArchiveData = "archiveData",
  VariableValues = "variableValues",
  Alarms = "alarms",
  Events = "events"
};

export enum VariableQueryType {
  Datasources = "Datasources",
  ArchivesForDatasource = "ArchivesForDataSource",
  VariablesForArchive = "VariablesForArchive",
  VariablesForDatasource = "VariablesForDatasource"
};


export interface MyQuery extends DataQuery {
  datasourceId: string;
  queryType: QueryType;
  alarmsEventsFilter:{variables:string[], onlyActive:boolean, onlyCleared:boolean, onlyUnacknowledged:boolean}
  archiveFilter:{archiveId?:string, variables:string[]}
  variableFilter:{variables:string[]}
};

export const defaultQuery: Partial<MyQuery> = {
  queryType:QueryType.ArchiveData,
  alarmsEventsFilter:{variables:['*'], onlyActive:false,onlyCleared:false, onlyUnacknowledged:false},
  archiveFilter:{variables:[]},
  variableFilter:{variables:[]}
};

export interface MyVariableQuery {
  queryType: VariableQueryType;
  datasourceId?: string;
  archiveId?: string;
}

export const defaultVariableQuery: Partial<MyVariableQuery> = {
  queryType:VariableQueryType.Datasources
};



export interface MyDataSourceOptions extends DataSourceJsonData {
};







