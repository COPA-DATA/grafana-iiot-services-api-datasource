import ServiceGridDatasource from './datasource';
import {ServiceGridQueryCtrl} from './query_ctrl';
import {ServiceGridConfigCtrl} from './config_ctrl';

class ServiceGridAnnotationsQueryCtrl {
  static templateUrl = 'partials/annotations.editor.html';
}

export {
  ServiceGridDatasource as Datasource,
  ServiceGridQueryCtrl as QueryCtrl,
  ServiceGridConfigCtrl as ConfigCtrl,
  ServiceGridAnnotationsQueryCtrl as AnnotationsQueryCtrl,
};
