import { DataQuery, DataSourceJsonData } from '@grafana/data';

export enum QueryType {
  ArchiveData = "archiveData",
  Alarms = "alarms",
  Events = "events"
}

export interface MyQuery extends DataQuery {
  datasourceId: string;
  queryType: QueryType;
  alarmsEventsFilter:{variable?:string, onlyActive:boolean, onlyCleared:boolean, onlyUnacknowledged:boolean}
  archiveFilter:{archiveId?:string, variable?:string}
}

export const defaultQuery: Partial<MyQuery> = {
  queryType:QueryType.ArchiveData,
  alarmsEventsFilter:{variable:'*', onlyActive:false,onlyCleared:false, onlyUnacknowledged:false},
  archiveFilter:{}
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  apiUrl?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  
}
