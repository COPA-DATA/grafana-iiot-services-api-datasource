System.register(["lodash", "app/plugins/sdk", "./css/query_editor.css!", "./constants"], function (exports_1, context_1) {
    "use strict";
    var __extends = (this && this.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var lodash_1, sdk_1, constants_1, ServiceGridQueryCtrl;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            },
            function (_1) {
            },
            function (constants_1_1) {
                constants_1 = constants_1_1;
            }
        ],
        execute: function () {
            ServiceGridQueryCtrl = (function (_super) {
                __extends(ServiceGridQueryCtrl, _super);
                function ServiceGridQueryCtrl($scope, $injector, templateSrv) {
                    var _this = _super.call(this, $scope, $injector) || this;
                    _this.templateSrv = templateSrv;
                    _this.defaults = {};
                    lodash_1.default.defaultsDeep(_this.target, _this.defaults);
                    _this.target.type = _this.target.type || 'timeserie';
                    _this.target.datasourceId = _this.target.datasourceId || 'select Datasource';
                    _this.target.archiveId = _this.target.archiveId || 'select Archive';
                    _this.target.variable = _this.target.variable || 'select Variable';
                    _this.target.queryType = _this.target.queryType || constants_1.QueryType.ArchiveData;
                    _this.queryTypes = [{ text: 'Archive Data', value: constants_1.QueryType.ArchiveData }, { text: 'Alarms', value: constants_1.QueryType.Alarms }, { text: 'Events', value: constants_1.QueryType.Events }];
                    _this.target.alarmEventsFilter = _this.target.alarmEventsFilter || {};
                    _this.target.alarmEventsFilter.variableName = _this.target.alarmEventsFilter.variableName || '*';
                    _this.target.alarmEventsFilter.onlyActive = _this.target.alarmEventsFilter.onlyActive || false;
                    _this.target.alarmEventsFilter.onlyCleared = _this.target.alarmEventsFilter.onlyCleared || false;
                    _this.target.alarmEventsFilter.onlyUnacknowledged = _this.target.alarmEventsFilter.onlyUnacknowledged || false;
                    return _this;
                }
                ServiceGridQueryCtrl.prototype.getDataSources = function (query) {
                    return this.datasource.findDataSources(query || '');
                };
                ServiceGridQueryCtrl.prototype.getArchives = function (query) {
                    return this.datasource.findArchives(this.target.datasourceId, query || '');
                };
                ServiceGridQueryCtrl.prototype.getVariablesForArchive = function (query) {
                    return this.datasource.findVariablesForArchive(this.target.datasourceId, this.target.archiveId, query || '');
                };
                ServiceGridQueryCtrl.prototype.getVariables = function (query) {
                    return this.datasource.findVariables(this.target.datasourceId, query || '');
                };
                ServiceGridQueryCtrl.prototype.onChangeInternal = function () {
                    this.panelCtrl.refresh();
                };
                ServiceGridQueryCtrl.templateUrl = 'partials/query.editor.html';
                return ServiceGridQueryCtrl;
            }(sdk_1.QueryCtrl));
            exports_1("ServiceGridQueryCtrl", ServiceGridQueryCtrl);
        }
    };
});
//# sourceMappingURL=query_ctrl.js.map