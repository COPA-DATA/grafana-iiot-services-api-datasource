import { DataQuery, DataSourceJsonData } from '@grafana/data';

export enum DataSourceQueryType {
  ArchiveData = "archiveData",
  VariableValues = "variableValues",
  Alarms = "alarms",
  Events = "events"
};

export enum TemplateVariableQueryType {
  Datasources = "Datasources",
  ArchivesForDatasource = "ArchivesForDataSource",
  VariablesForArchive = "VariablesForArchive",
  VariablesForDatasource = "VariablesForDatasource"
};

export interface DataSourceQuery extends DataQuery {
  datasourceId: string;
  queryType: DataSourceQueryType;
  alarmsEventsFilter:{variables:string[], onlyActive:boolean, onlyCleared:boolean, onlyUnacknowledged:boolean}
  archiveFilter:{archiveId?:string, variables:string[]}
  variableFilter:{variables:string[]}
};

export const defaultQuery: Partial<DataSourceQuery> = {
  queryType:DataSourceQueryType.ArchiveData,
  alarmsEventsFilter:{variables:['*'], onlyActive:false,onlyCleared:false, onlyUnacknowledged:false},
  archiveFilter:{variables:[]},
  variableFilter:{variables:[]}
};

export interface TemplateVariableQuery {
  queryType: TemplateVariableQueryType;
  datasourceId?: string;
  archiveId?: string;
}

export const defaultVariableQuery: Partial<TemplateVariableQuery> = {
  queryType:TemplateVariableQueryType.Datasources
};

export interface SGApiDataSourceOptions extends DataSourceJsonData {
};
