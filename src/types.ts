import { DataQuery, DataSourceJsonData } from '@grafana/data';

export enum DataSourceQueryType {
  ArchiveData = "archiveData",
  VariableValues = "variableValues",
  Alarms = "alarms",
  Events = "events"
};

export enum DataOrigin {
  ServiceEngine = "ServiceEngine",
  DataStorage = "DataStorage"
}

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
  archiveFilter:{origin: DataOrigin, archiveId?:string, variables:string[]}
  variableFilter:{variables:string[]}
};

export const defaultQuery: Partial<DataSourceQuery> = {
  queryType:DataSourceQueryType.ArchiveData,
  alarmsEventsFilter:{variables:['*'], onlyActive:false,onlyCleared:false, onlyUnacknowledged:false},
  archiveFilter:{origin: DataOrigin.DataStorage, variables:[]},
  variableFilter:{variables:[]}
};

export interface TemplateVariableQuery {
  queryType: TemplateVariableQueryType;
  datasourceId?: string;
  archiveId?: string;
  regexString: string;  // used to filter the returned values for a specific regex
}

export const defaultVariableQuery: Partial<TemplateVariableQuery> = {
  queryType:TemplateVariableQueryType.Datasources
};

export interface SGApiDataSourceOptions extends DataSourceJsonData {
  showOfflineDatasources?: boolean;
};
