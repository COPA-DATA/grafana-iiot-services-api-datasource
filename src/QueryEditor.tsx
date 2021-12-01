import defaults from 'lodash/defaults';
import './css/app.css';

import React, { Component } from 'react';
import { AsyncMultiSelect, AsyncSelect, Field, Label, Select, Switch } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { defaultQuery, SGApiDataSourceOptions, DataSourceQuery, DataSourceQueryType, TemplateVariableQueryType, DataOrigin } from './types';
import { getTemplateSrv } from "@grafana/runtime"
import { } from '@emotion/core';  // see https://github.com/grafana/grafana/issues/26512

type Props = QueryEditorProps<DataSource, DataSourceQuery, SGApiDataSourceOptions>;
type State = {
  datasourceSelectables: Array<SelectableValue<string>>,
  queryTypeSelectables: Array<SelectableValue<DataSourceQueryType>>,
  archiveSelectables: Array<SelectableValue<string>>,
  archiveVariableSelectables: Array<SelectableValue<string>>,
  variableSelectables: Array<SelectableValue<string>>,
  dataOriginSelectables: Array<SelectableValue<DataOrigin>>,
}

export class QueryEditor extends Component<Props, State> {

  constructor(props: Readonly<Props>) {
    super(props);

    let archives: SelectableValue<DataSourceQueryType> = { label: 'Archive Data', value: DataSourceQueryType.ArchiveData };
    let values: SelectableValue<DataSourceQueryType> = { label: 'Online Values', value: DataSourceQueryType.VariableValues };
    let alarms: SelectableValue<DataSourceQueryType> = { label: 'Alarms', value: DataSourceQueryType.Alarms };
    let events: SelectableValue<DataSourceQueryType> = { label: 'Events', value: DataSourceQueryType.Events };
    let dataorigins: SelectableValue<DataOrigin>[] = [{label: "Data Storage", value: DataOrigin.DataStorage},{label: "Serivce Engine", value: DataOrigin.ServiceEngine}];

    this.state = {
      datasourceSelectables: [],
      queryTypeSelectables: [archives, values, alarms, events],
      archiveSelectables: [],
      archiveVariableSelectables: [],
      variableSelectables: [],
      dataOriginSelectables: dataorigins
    };

  }

  getTemplateVariables = (queryType: TemplateVariableQueryType) => {
    const templateSrv = getTemplateSrv();
    const variablesProtected = templateSrv.getVariables();
    const variablesStringfied = JSON.stringify(variablesProtected);
    const variables = JSON.parse(variablesStringfied);
    let result = [];
    for (let v of variables) {
      if (v.type == 'query' && v.query.queryType == queryType) {
        result.push(v);
      }
    }
    return result;
  }

  componentDidMount = () => {
    const { datasource } = this.props;
    datasource.findDataSources().then(ds => {
      // add potential datasource query variables to the list
      let vars = this.getTemplateVariables(TemplateVariableQueryType.Datasources);
      for (let v of vars) {
        ds.unshift({ label: '$' + v.name, value: '$' + v.name })
      }
      this.setState({ datasourceSelectables: ds });
    })
  }

  loadArchives = (): Promise<SelectableValue<string>[]> => {
    const { query, datasource } = this.props;
    return new Promise(resolve => {
      datasource.findArchives(query.datasourceId, query.archiveFilter.origin).then(ars => {
        // add potential datasource query variables to the list
        let vars = this.getTemplateVariables(TemplateVariableQueryType.ArchivesForDatasource);
        for (let v of vars) {
          ars.unshift({ label: '$' + v.name, value: '$' + v.name })
        }
        this.setState({ archiveSelectables: ars });
        resolve(ars);
      })
    })
  }

  loadArchiveVariables = (): Promise<SelectableValue<string>[]> => {
    const { query, datasource } = this.props;
    return new Promise(resolve => {
      datasource.findVariablesForArchive(query.datasourceId, query.archiveFilter.archiveId!).then(vars => {
        // add potential datasource query variables to the list
        let templateVars = this.getTemplateVariables(TemplateVariableQueryType.VariablesForArchive);
        for (let v of templateVars) {
          vars.unshift({ label: '$' + v.name, value: '${' + v.name + ':json}' })
        }
        this.setState({ archiveVariableSelectables: vars });
        resolve(vars);
      })
    })
  }

  loadVariables = (): Promise<SelectableValue<string>[]> => {
    const { query, datasource } = this.props;
    return new Promise(resolve => {
      datasource.findVariables(query.datasourceId).then(vars => {
        // add potential datasource query variables to the list
        let templateVars = this.getTemplateVariables(TemplateVariableQueryType.VariablesForDatasource);
        for (let v of templateVars) {
          vars.unshift({ label: '$' + v.name, value: '${' + v.name + ':json}' })
        }
        vars.unshift({ label: '*', value: '*' });
        this.setState({ variableSelectables: vars });
        resolve(vars);
      })
    })
  }

  onSwitchChanged = (event: React.FormEvent<HTMLInputElement>) => {
    const { query, onChange } = this.props;
    onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, onlyActive: !query.alarmsEventsFilter.onlyActive } });

  }

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { onChange, onRunQuery } = this.props;
    const { datasourceId, queryType, archiveFilter, alarmsEventsFilter, variableFilter } = query;

    const dataOriginFilter = 
      <div className="gf-form">
          <Label className="gf-form-label query-keyword width-7 margin-1">Origin</Label>
          <Select className="min-width-15"
            onChange={(value) => { onChange({ ...query, archiveFilter: { ...query.archiveFilter, origin: value.value! } }) }}
            options={this.state.dataOriginSelectables}
            value={this.state.dataOriginSelectables.find(i => i.value == archiveFilter.origin)}
          />
        </div>

    const archiveFilterContent =
      <div className="gf-form-inline">
        <div className="gf-form">
          <Label className="gf-form-label query-keyword width-7 margin-1">Archive</Label>
          <AsyncSelect className="min-width-15"
            key={JSON.stringify([query.datasourceId, query.archiveFilter.origin])}
            placeholder='Select an archive...'
            onChange={(value) => { onChange({ ...query, archiveFilter: { ...query.archiveFilter, archiveId: value.value! } }) }}
            loadOptions={this.loadArchives}
            defaultOptions
            value={this.state.archiveSelectables.find(i => i.value == archiveFilter.archiveId)}
            invalid={!this.state.archiveSelectables.find(i => i.value == archiveFilter.archiveId)}
          />
        </div>
        <div className="gf-form">
          <Label className="gf-form-label query-keyword width-7 margin-1">Variable</Label>
          <AsyncMultiSelect className="min-width-15"
            key={JSON.stringify([query.datasourceId, query.archiveFilter.origin, query.archiveFilter.archiveId])}
            placeholder='Select a variable...'
            onChange={(value) => { onChange({ ...query, archiveFilter: { ...query.archiveFilter, variables: value.map(v => { return v.value! }) } }); onRunQuery(); }}
            loadOptions={this.loadArchiveVariables}
            defaultOptions
            value={this.state.archiveVariableSelectables.filter(i => archiveFilter.variables.includes(i.value!))}
            invalid={this.state.archiveVariableSelectables.filter(i => archiveFilter.variables.includes(i.value!)).length == 0}
          />
        </div>
      </div>;

    const alarmsFilterContent =
      <div className="gf-form-inline">
        <div className="gf-form">
          <Label className="gf-form-label query-keyword width-7 margin-1">Variable Filter</Label>
          <AsyncMultiSelect className="min-width-10"
            key={query.queryType}
            onChange={(value) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, variables: value.map((v: SelectableValue<string>) => { return v.value! }) } }); onRunQuery(); }}
            loadOptions={this.loadVariables}
            defaultOptions
            value={this.state.variableSelectables.filter(i => alarmsEventsFilter.variables.includes(i.value!))}
            invalid={this.state.variableSelectables.filter(i => alarmsEventsFilter.variables.includes(i.value!)).length == 0}
          />
        </div>
        <div className="gf-form">
          <Label className="gf-form-label query-keyword margin-1">Only Active</Label>
          <Field>
            <div className="center">
              <Switch
                onChange={(e) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, onlyActive: !query.alarmsEventsFilter.onlyActive } }); onRunQuery(); }}
                value={alarmsEventsFilter.onlyActive}
              />
            </div>
          </Field>
        </div>
        <div className="gf-form">
          <Label className="gf-form-label query-keyword margin-1">Only Cleared</Label>
          <Field>
            <div className="center">
              <Switch
                onChange={(e) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, onlyCleared: !query.alarmsEventsFilter.onlyCleared } }); onRunQuery(); }}
                value={alarmsEventsFilter.onlyCleared}
              />
            </div>
          </Field>
        </div>
        <div className="gf-form">
          <Label className="gf-form-label query-keyword margin-1">Only Unacknowledged</Label>
          <Field>
            <div className="center">
              <Switch
                onChange={(e) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, onlyUnacknowledged: !query.alarmsEventsFilter.onlyUnacknowledged } }); onRunQuery(); }}
                value={alarmsEventsFilter.onlyUnacknowledged}
              />
            </div>
          </Field>
        </div>
      </div>;

    const eventsFilterContent =
      <div className="gf-form-inline">
        <div className="gf-form">
          <Label className="gf-form-label query-keyword width-7 margin-1">Variable Filter</Label>
          <AsyncMultiSelect className="min-width-15"
            key={query.queryType}
            onChange={(value) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, variables: value.map((v: SelectableValue<string>) => { return v.value! }) } }); onRunQuery(); }}
            loadOptions={this.loadVariables}
            defaultOptions
            value={this.state.variableSelectables.filter(i => alarmsEventsFilter.variables.includes(i.value!))}
            invalid={this.state.variableSelectables.filter(i => alarmsEventsFilter.variables.includes(i.value!)).length == 0}
          />
        </div>
      </div>;

    const variableValuesFilterContent = 
    <div className="gf-form-inline">
    <div className="gf-form">
      <Label className="gf-form-label query-keyword width-7 margin-1">Variable Filter</Label>
      <AsyncMultiSelect className="min-width-15"
        key={query.queryType}
        onChange={(value) => { onChange({ ...query, variableFilter: { ...query.variableFilter, variables: value.map((v: SelectableValue<string>) => { return v.value! }) } }); onRunQuery(); }}
        loadOptions={this.loadVariables}
        defaultOptions
        value={this.state.variableSelectables.filter(i => variableFilter.variables.includes(i.value!))}
        invalid={this.state.variableSelectables.filter(i => variableFilter.variables.includes(i.value!)).length == 0}
      />
    </div>
  </div>;

    let filter;
    switch (query.queryType) {
      case DataSourceQueryType.ArchiveData:
        filter = archiveFilterContent;
        break;
      case DataSourceQueryType.Alarms:
        filter = alarmsFilterContent;
        break;
      case DataSourceQueryType.Events:
        filter = eventsFilterContent;
        break;
      case DataSourceQueryType.VariableValues:
          filter = variableValuesFilterContent;
          break;
    }

    return (
      <div>
        <div className="gf-form-group">
          <div className="gf-form-inline">
            <div className="gf-form">
              <Label className="gf-form-label query-keyword width-7 margin-1">Datasource</Label>
              <Select className="min-width-20"
                placeholder='Select a datasource...'
                onChange={(value) => onChange({ ...query, datasourceId: value.value! })}
                options={this.state.datasourceSelectables}
                value={this.state.datasourceSelectables.find(i => i.value == query.datasourceId)}
                invalid={!datasourceId}
              />
            </div>
          </div>
          <div className="gf-form-inline">
            <div className="gf-form">
              <Label className="gf-form-label query-keyword width-7 margin-1">Query Type</Label>
              <Select className="min-width-10"
                onChange={(value) => { onChange({ ...query, queryType: value.value! }); onRunQuery(); }}
                options={this.state.queryTypeSelectables}
                value={this.state.queryTypeSelectables.find(i => i.value == queryType)}
              />
            </div>
            {query.queryType == DataSourceQueryType.ArchiveData && dataOriginFilter}
          </div>
          {filter}

        </div>
      </div>
    );
  }
}
