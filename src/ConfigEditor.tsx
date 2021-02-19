import React, { ChangeEvent, PureComponent } from 'react';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { SGApiDataSourceOptions } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<SGApiDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onOptionsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      path: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  render() {
    const { options, onOptionsChange } = this.props;
     
    return (
      <div className="gf-form-group">
        <div className="gf-form">
          <DataSourceHttpSettings
            defaultUrl="http://localhost:9400"
            dataSourceConfig={options}
            showAccessOptions={true}
            //sigV4AuthEnabled={true}
            onChange={onOptionsChange}
          />  
        </div>
      </div>
    );
  }
}
