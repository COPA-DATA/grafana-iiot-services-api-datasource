import defaults from 'lodash/defaults';

import React, { Component } from 'react';
import { AsyncSelect, Field, HorizontalGroup, Input, Label, Select, Switch, VerticalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { defaultQuery, MyDataSourceOptions, MyQuery, QueryType } from './types';
import { } from '@emotion/core';  // see https://github.com/grafana/grafana/issues/26512


type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;
type State = {
  datasourceSelectables: Array<SelectableValue<string>>,
  queryTypeSelectables: Array<SelectableValue<QueryType>>,
  archiveSelectables: Array<SelectableValue<string>>,
  archiveVariableSelectables: Array<SelectableValue<string>>
  variableSelectables: Array<SelectableValue<string>>,
}

export class QueryEditor extends Component<Props, State> {

  aliasUpdatetimer?: NodeJS.Timeout;

  constructor(props: Readonly<Props>) {
    super(props);

    let archives: SelectableValue<QueryType> = { label: 'Archive Data', value: QueryType.ArchiveData };
    let alarms: SelectableValue<QueryType> = { label: 'Alarms', value: QueryType.Alarms };
    let events: SelectableValue<QueryType> = { label: 'Events', value: QueryType.Events };


    this.state = {
      datasourceSelectables: [],
      queryTypeSelectables: [archives, alarms, events],
      archiveSelectables: [],
      archiveVariableSelectables: [],
      variableSelectables: [],
    };

  }

  componentDidMount = () => {
    const { datasource } = this.props;
    datasource.findDataSources().then(ds => {
      this.setState({ datasourceSelectables: ds });
    })
  }

  loadArchives = (): Promise<SelectableValue<string>[]> => {
    const { query, datasource } = this.props;
    return new Promise(resolve => {
      datasource.findArchives(query.datasourceId).then(ars => {
        this.setState({ archiveSelectables: ars });
        resolve(ars);
      })
    })
  }

  loadArchiveVariables = (): Promise<SelectableValue<string>[]> => {
    const { query, datasource } = this.props;
    return new Promise(resolve => {
      datasource.findVariablesForArchive(query.datasourceId, query.archiveFilter.archiveId!).then(vars => {
        this.setState({ archiveVariableSelectables: vars });
        resolve(vars);
      })
    })
  }

  loadVariables = (): Promise<SelectableValue<string>[]> => {
    const { query, datasource } = this.props;
    return new Promise(resolve => {
      datasource.findVariables(query.datasourceId).then(vars => {
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

  updateAlias = () => {
    this.aliasUpdatetimer = undefined;
    this.props.onRunQuery();
  }

  onAliasChanged = (event: React.FormEvent<HTMLInputElement>) => {
    const { query, onChange } = this.props;
    onChange({ ...query, alias: event.currentTarget.value });

    if (this.aliasUpdatetimer) {
      clearTimeout(this.aliasUpdatetimer);
    }
    this.aliasUpdatetimer = setTimeout(this.updateAlias, 2000);
  }


  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { onChange, onRunQuery } = this.props;
    const { datasourceId, queryType, archiveFilter, alarmsEventsFilter, alias } = query;

    const archiveFilterContent =
      <HorizontalGroup>
        <HorizontalGroup>
          <Label>Archive</Label>
          <AsyncSelect className="gf-form  min-width-10"
            key={query.datasourceId}
            placeholder='Select an archive...'
            onChange={(value) => { onChange({ ...query, archiveFilter: { ...query.archiveFilter, archiveId: value.value! } }) }}
            loadOptions={this.loadArchives}
            defaultOptions
            value={this.state.archiveSelectables.find(i => i.value == archiveFilter.archiveId)}
            invalid={!this.state.archiveSelectables.find(i => i.value == archiveFilter.archiveId)}
          />
        </HorizontalGroup>
        <HorizontalGroup>
          <Label>Variable</Label>
          <AsyncSelect className="gf-form  min-width-10"
            key={query.archiveFilter.archiveId}
            placeholder='Select a variable...'
            onChange={(value) => { onChange({ ...query, archiveFilter: { ...query.archiveFilter, variable: value.value! } }); onRunQuery(); }}
            loadOptions={this.loadArchiveVariables}
            defaultOptions
            value={this.state.archiveVariableSelectables.find(i => i.value == archiveFilter.variable)}
            invalid={!this.state.archiveVariableSelectables.find(i => i.value == archiveFilter.variable)}
          />
        </HorizontalGroup>
        <HorizontalGroup>
          <Label>Alias</Label>
          <Input
            name='alias'
            value={alias}
            onChange={this.onAliasChanged}
          />
        </HorizontalGroup>
      </HorizontalGroup>;

    const alarmsFilterContent =
      <HorizontalGroup>
        <HorizontalGroup>
          <Label>Variable Filter</Label>
          <AsyncSelect className="gf-form  min-width-10"
            key={query.alarmsEventsFilter.variable}
            onChange={(value) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, variable: value.value! } }); onRunQuery(); }}
            loadOptions={this.loadVariables}
            defaultOptions
            value={this.state.variableSelectables.find(i => i.value == query.alarmsEventsFilter.variable)}
            invalid={!this.state.variableSelectables.find(i => i.value == query.alarmsEventsFilter.variable)}
          />
        </HorizontalGroup>
        <HorizontalGroup>
          <Field label="Only Active" horizontal>
            <Switch
              onChange={(e) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, onlyActive: !query.alarmsEventsFilter.onlyActive } }); onRunQuery(); }}
              value={alarmsEventsFilter.onlyActive}
            />
          </Field>
          <Field label="Only Cleared" horizontal>
            <Switch
              onChange={(e) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, onlyCleared: !query.alarmsEventsFilter.onlyCleared } }); onRunQuery(); }}
              value={alarmsEventsFilter.onlyCleared}
            />
          </Field>
          <Field label="Only Unacknowledged" horizontal>
            <Switch
              onChange={(e) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, onlyUnacknowledged: !query.alarmsEventsFilter.onlyUnacknowledged } }); onRunQuery(); }}
              value={alarmsEventsFilter.onlyUnacknowledged}
            />
          </Field>
        </HorizontalGroup>
      </HorizontalGroup>;

    const eventsFilterContent =
      <HorizontalGroup>
        <HorizontalGroup>
          <Label>Variable Filter</Label>
          <AsyncSelect className="gf-form  min-width-10"
            key={query.alarmsEventsFilter.variable}
            onChange={(value) => { onChange({ ...query, alarmsEventsFilter: { ...query.alarmsEventsFilter, variable: value.value! } }); onRunQuery(); }}
            loadOptions={this.loadVariables}
            defaultOptions
            value={this.state.variableSelectables.find(i => i.value == query.alarmsEventsFilter.variable)}
            invalid={!this.state.variableSelectables.find(i => i.value == query.alarmsEventsFilter.variable)}
          />
        </HorizontalGroup>
      </HorizontalGroup>;


    let filter;
    switch (query.queryType) {
      case QueryType.ArchiveData:
        filter = archiveFilterContent;
        break;
      case QueryType.Alarms:
        filter = alarmsFilterContent;
        break;
      case QueryType.Events:
          filter = eventsFilterContent;
          break;
    }

    return (
      <div>
        <VerticalGroup>
          <HorizontalGroup >
            <Label>Datasource</Label>
            <Select className="gf-form  min-width-15"
              placeholder='Select a datasource...'
              onChange={(value) => onChange({ ...query, datasourceId: value.value! })}
              options={this.state.datasourceSelectables}
              value={this.state.datasourceSelectables.find(i => i.value == query.datasourceId)}
              invalid={!datasourceId}
            />
          </HorizontalGroup>
          <HorizontalGroup>
            <Label>Query Type</Label>
            <Select
              onChange={(value) => { onChange({ ...query, queryType: value.value! }); onRunQuery(); }}
              options={this.state.queryTypeSelectables}
              value={this.state.queryTypeSelectables.find(i => i.value == queryType)}
            />
          </HorizontalGroup>
          {filter}

        </VerticalGroup>
      </div>
    );
  }
}

