import './css/app.css';
import { SelectableValue } from '@grafana/data';
import { Label, Select, AsyncSelect } from '@grafana/ui';
import { defaults } from 'lodash';
import React, { Component } from 'react';
import { TemplateVariableQuery, TemplateVariableQueryType, defaultVariableQuery } from './types';
import { DataSource } from './DataSource';

interface TemplateVariableQueryProps {
  query: TemplateVariableQuery;
  onChange: (query: TemplateVariableQuery, definition: string) => void;
  datasource: DataSource;
}

type State = {
  datasourceSelectables: Array<SelectableValue<string>>,
  queryTypeSelectables: Array<SelectableValue<TemplateVariableQueryType>>,
  archiveSelectables: Array<SelectableValue<string>>,
  archiveVariableSelectables: Array<SelectableValue<string>>
}

export class VariableQueryEditor extends Component<TemplateVariableQueryProps, State> {

  constructor(props: Readonly<TemplateVariableQueryProps>) {
    super(props);

    const queryTypeSelectables = [
      { label: 'Datasources', value: TemplateVariableQueryType.Datasources },
      { label: 'Archives for datasource', value: TemplateVariableQueryType.ArchivesForDatasource },
      { label: 'Variables for datasource', value: TemplateVariableQueryType.VariablesForDatasource },
      { label: 'Variables for archive', value: TemplateVariableQueryType.VariablesForArchive },
    ]

    this.state = {
      datasourceSelectables: [],
      queryTypeSelectables: queryTypeSelectables,
      archiveSelectables: [],
      archiveVariableSelectables: [],
    };
  }

  loadDatasources = (): Promise<SelectableValue<string>[]> => {
    const { datasource } = this.props;
    return new Promise(resolve => {
      datasource.findDataSources().then(ds => {
        this.setState({ datasourceSelectables: ds });
        resolve(ds);
      })
    })
  }

  loadArchives = (): Promise<SelectableValue<string>[]> => {
    const { query, datasource } = this.props;
    return new Promise(resolve => {
      datasource.findArchives(query.datasourceId!).then(ars => {
        this.setState({ archiveSelectables: ars });
        resolve(ars);
      })
    })
  }

  render() {
    const query = defaults(this.props.query, defaultVariableQuery);
    const { onChange } = this.props;

    const datasourceSelect =
      <div className="gf-form-inline">
        <div className="gf-form">
          <Label className="gf-form-label query-keyword width-7 margin-1">Datasource</Label>
          <AsyncSelect className="min-width-20"
            key={query.queryType}
            placeholder='Select a datasource...'
            onChange={(value) => { onChange({ ...query, datasourceId: value.value! }, 'Archives for the Service Grid Datasource ' + value.label) }}
            loadOptions={this.loadDatasources}
            defaultOptions
            value={this.state.datasourceSelectables.find(i => i.value == query.datasourceId)}
            invalid={!this.state.datasourceSelectables.find(i => i.value == query.datasourceId)}
          />
        </div>
      </div>

    const archiveSelect =
      <div className="gf-form-inline">
        <div className="gf-form">
          <Label className="gf-form-label query-keyword width-7 margin-1">Archive</Label>
          <AsyncSelect className="min-width-15"
            key={query.datasourceId}
            placeholder='Select an archive...'
            onChange={(value) => { onChange({ ...query, archiveId: value.value! }, 'Variables for the Archive ' + value.label) }}
            loadOptions={this.loadArchives}
            defaultOptions
            value={this.state.archiveSelectables.find(i => i.value == query.archiveId)}
            invalid={!this.state.archiveSelectables.find(i => i.value == query.archiveId)}
          />
        </div>
      </div>

    return (
      <div>
        <div className="gf-form-group">
          <div className="gf-form-inline">
            <div className="gf-form">
              <Label className="gf-form-label query-keyword width-7 margin-1">Query Type</Label>
              <Select className="min-width-10"
                onChange={(value) => onChange({ ...query, queryType: value.value! }, 'Datasources of Service Grid')}
                options={this.state.queryTypeSelectables}
                value={this.state.queryTypeSelectables.find(i => i.value == query.queryType)}
              />
            </div>
          </div>
          {query.queryType != TemplateVariableQueryType.Datasources && datasourceSelect}
          {query.queryType == TemplateVariableQueryType.VariablesForArchive && archiveSelect}
        </div>
      </div>
    );
  }
};
