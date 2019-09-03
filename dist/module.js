System.register(["./datasource", "./query_ctrl", "./config_ctrl"], function (exports_1, context_1) {
    "use strict";
    var datasource_1, query_ctrl_1, config_ctrl_1, ServiceGridAnnotationsQueryCtrl;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (datasource_1_1) {
                datasource_1 = datasource_1_1;
            },
            function (query_ctrl_1_1) {
                query_ctrl_1 = query_ctrl_1_1;
            },
            function (config_ctrl_1_1) {
                config_ctrl_1 = config_ctrl_1_1;
            }
        ],
        execute: function () {
            exports_1("Datasource", datasource_1.default);
            exports_1("QueryCtrl", query_ctrl_1.ServiceGridQueryCtrl);
            exports_1("ConfigCtrl", config_ctrl_1.ServiceGridConfigCtrl);
            ServiceGridAnnotationsQueryCtrl = (function () {
                function ServiceGridAnnotationsQueryCtrl() {
                }
                ServiceGridAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html';
                return ServiceGridAnnotationsQueryCtrl;
            }());
            exports_1("AnnotationsQueryCtrl", ServiceGridAnnotationsQueryCtrl);
        }
    };
});
//# sourceMappingURL=module.js.map