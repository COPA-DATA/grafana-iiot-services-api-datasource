///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import {QueryCtrl} from 'app/plugins/sdk';
import './css/query_editor.css!';
import {QueryType} from './constants';

export class ServiceGridQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  defaults = {
  };
  queryTypes: {text:string,value:QueryType}[];

  /** @ngInject **/
  constructor($scope, $injector, private templateSrv) {
    super($scope, $injector);

    _.defaultsDeep(this.target, this.defaults);

    this.target.type = this.target.type || 'timeserie';
    this.target.datasourceId = this.target.datasourceId || 'select Datasource';
    this.target.archiveId = this.target.archiveId || 'select Archive';
    this.target.variable = this.target.variable || 'select Variable';
    this.target.queryType = this.target.queryType || QueryType.ArchiveData;

    this.queryTypes = [{text:'Archive Data', value:QueryType.ArchiveData},{text:'Alarms', value:QueryType.Alarms},{text:'Events',value:QueryType.Events}];

    this.target.alarmEventsFilter = this.target.alarmEventsFilter || {};
    this.target.alarmEventsFilter.variableName = this.target.alarmEventsFilter.variableName || '*';
    this.target.alarmEventsFilter.onlyActive = this.target.alarmEventsFilter.onlyActive || false;
    this.target.alarmEventsFilter.onlyCleared = this.target.alarmEventsFilter.onlyCleared || false;
    this.target.alarmEventsFilter.onlyUnacknowledged = this.target.alarmEventsFilter.onlyUnacknowledged || false;

  }

  getDataSources(query)
  {
    return this.datasource.findDataSources(query || '');
  }

  getArchives(query)
  {
    return this.datasource.findArchives(this.target.datasourceId, query || '');
  }

  getVariablesForArchive(query)
  {
    return this.datasource.findVariablesForArchive(this.target.datasourceId, this.target.archiveId, query || '');
  }

  getVariables(query)
  {
    return this.datasource.findVariables(this.target.datasourceId, query || '');
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }
}
