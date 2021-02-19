import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './DataSource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import { VariableQueryEditor } from './VariableQueryEditor';
import { DataSourceQuery, SGApiDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<DataSource, DataSourceQuery, SGApiDataSourceOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor)
  .setVariableQueryEditor(VariableQueryEditor);
