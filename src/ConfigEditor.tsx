import React, { ChangeEvent, PureComponent } from 'react';
import { DataSourceHttpSettings, LegacyForms} from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, onUpdateDatasourceJsonDataOptionChecked } from '@grafana/data';
import { SGApiDataSourceOptions } from './types';
const { Switch } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<SGApiDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onOptionsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      showOfflineDatasources: event.target.checked
    };
    onOptionsChange({ ...options, jsonData });
  };

  render() {
    const { options, onOptionsChange } = this.props;
     
    return (
      <div className="gf-form-group">
        <div className="gf-form">
          <DataSourceHttpSettings
            defaultUrl="https://localhost:9443/iiot-api"
            dataSourceConfig={options}
            showAccessOptions={true}
            //sigV4AuthEnabled={true}
            onChange={onOptionsChange}
          />
        </div>
        <div className="gf-form">
          <div className="gf-form-group">
            <h3 className="page-heading">Misc</h3>
            <div className="gf-form-group">

              <div className="gf-form">
                <Switch
                  checked={options.jsonData.showOfflineDatasources ?? false}
                  label="Show offline Datasources" 
                  labelClass="width-14"
                  onChange={onUpdateDatasourceJsonDataOptionChecked(this.props, 'showOfflineDatasources')}
                  tooltip="Check this option to include temporary offline data sources in the query editor"
                />
              </div>

            </div>
          </div>
        </div>

      </div>
    );
  }
}
