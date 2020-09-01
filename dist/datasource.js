System.register(["./constants"], function (exports_1, context_1) {
    "use strict";
    var constants_1, ServiceGridDataSource;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (constants_1_1) {
                constants_1 = constants_1_1;
            }
        ],
        execute: function () {
            ServiceGridDataSource = (function () {
                function ServiceGridDataSource(instanceSettings, $q, backendSrv, templateSrv) {
                    this.backendSrv = backendSrv;
                    this.templateSrv = templateSrv;
                    this.q = $q;
                    this.name = instanceSettings.name;
                    this.id = instanceSettings.id;
                    this.url = instanceSettings.url;
                }
                ServiceGridDataSource.prototype.query = function (options) {
                    var queries = options.targets.map(function (item) {
                        if (item.hide) {
                            return '';
                        }
                        return {
                            refId: item.refId,
                            datasourceId: item.datasourceId,
                            archiveId: item.archiveId,
                            variable: item.variable,
                            alias: item.alias,
                            queryType: item.queryType,
                            alarmEventsFilter: item.alarmEventsFilter
                        };
                    });
                    var dateFrom = options.range.from;
                    var dateTo = options.range.to;
                    if (queries.length === 0) {
                        return Promise.resolve({ data: [] });
                    }
                    var requestsVariableValues = queries.filter(function (q) { return q.queryType === constants_1.QueryType.ArchiveData; });
                    var requestsAlarms = queries.filter(function (q) { return q.queryType === constants_1.QueryType.Alarms; });
                    var requestsEvents = queries.filter(function (q) { return q.queryType === constants_1.QueryType.Events; });
                    var numberQueryTypes = [{ type: constants_1.QueryType.ArchiveData, value: requestsVariableValues.length },
                        { type: constants_1.QueryType.Alarms, value: requestsAlarms.length },
                        { type: constants_1.QueryType.Events, value: requestsEvents.length }];
                    var orderedQueryTypes = numberQueryTypes.sort(function (a, b) { return b.value - a.value; });
                    switch (orderedQueryTypes[0].type) {
                        case constants_1.QueryType.ArchiveData:
                            return this.queryVariableValues(requestsVariableValues, dateFrom, dateTo);
                        case constants_1.QueryType.Alarms:
                            return this.queryAlarmsEvents(requestsAlarms, dateFrom, dateTo, constants_1.QueryType.Alarms);
                        case constants_1.QueryType.Events:
                            return this.queryAlarmsEvents(requestsEvents, dateFrom, dateTo, constants_1.QueryType.Events);
                    }
                };
                ServiceGridDataSource.prototype.queryVariableValues = function (queries, dateFrom, dateTo) {
                    var requests = [];
                    var requestGrouped = {};
                    var variableNameMapping = {};
                    if (queries.length === 0) {
                        return Promise.resolve({ data: [] });
                    }
                    for (var _i = 0, queries_1 = queries; _i < queries_1.length; _i++) {
                        var query = queries_1[_i];
                        if (query.datasourceId === undefined || query.archiveId === undefined || query.variable === undefined) {
                            continue;
                        }
                        if (query.datasourceId in requestGrouped == false) {
                            requestGrouped[query.datasourceId] = {};
                        }
                        if (query.archiveId in requestGrouped[query.datasourceId] == false) {
                            requestGrouped[query.datasourceId][query.archiveId] = [];
                        }
                        if (requestGrouped[query.datasourceId][query.archiveId].includes(query.variable) == false) {
                            requestGrouped[query.datasourceId][query.archiveId].push(query.variable);
                        }
                        if (query.datasourceId in variableNameMapping == false) {
                            variableNameMapping[query.datasourceId] = {};
                        }
                        if (query.variable in variableNameMapping[query.datasourceId] == false) {
                            variableNameMapping[query.datasourceId][query.variable] = query.alias;
                        }
                    }
                    for (var _a = 0, _b = Object.keys(requestGrouped); _a < _b.length; _a++) {
                        var datasourceId = _b[_a];
                        for (var _c = 0, _d = Object.keys(requestGrouped[datasourceId]); _c < _d.length; _c++) {
                            var archiveId = _d[_c];
                            var requestUrl = this.url + "/api/v1/datasources/" + datasourceId + "/archives/" + archiveId + "/query";
                            var variableList = requestGrouped[datasourceId][archiveId];
                            var requestBody = {
                                variableFilter: {
                                    variablenames: variableList
                                },
                                timeFilter: {
                                    from: dateFrom.toISOString(),
                                    to: dateTo.toISOString(),
                                    type: "Absolute"
                                }
                            };
                            var request = this.backendSrv.datasourceRequest({
                                url: requestUrl,
                                data: requestBody,
                                method: 'POST'
                            });
                            requests.push(request);
                        }
                    }
                    return Promise.all(requests).then(function (res) {
                        var varResults = [];
                        for (var _i = 0, res_1 = res; _i < res_1.length; _i++) {
                            var response = res_1[_i];
                            if (res === undefined || !('data' in response) || !('variables' in response.data)) {
                                throw { data: { message: 'Query Error: Retrieved data has invalid format' } };
                            }
                            var variables = response.data.variables;
                            if (variables.length == 0) {
                                continue;
                            }
                            for (var _a = 0, variables_1 = variables; _a < variables_1.length; _a++) {
                                var variableEntry = variables_1[_a];
                                var dataPoints = [];
                                for (var _b = 0, _c = variableEntry.values; _b < _c.length; _b++) {
                                    var valueEntry = _c[_b];
                                    var timestamp = Date.parse(valueEntry.timestamp);
                                    var value = valueEntry.value;
                                    if (!isNaN(value)) {
                                        value = Number(value);
                                    }
                                    dataPoints.push([value, timestamp]);
                                }
                                if (!('archiveVariable' in variableEntry) || !('variableName' in variableEntry.archiveVariable)) {
                                    throw { data: { message: 'Query Error: Retrieved data has invalid format' } };
                                }
                                var startIndex = response.url.indexOf("api/v1/datasources/") + 19;
                                var datasource = response.url.substring(startIndex, startIndex + 36);
                                var variableName = variableEntry.archiveVariable.variableName;
                                var displayName = variableNameMapping[datasource][variableName] || variableName;
                                var varResultElement = { target: displayName, datapoints: dataPoints };
                                varResults.push(varResultElement);
                            }
                        }
                        return Promise.resolve({ data: varResults });
                    }, this.handleHttpErrors).catch(this.handleQueryException);
                };
                ServiceGridDataSource.prototype.queryAlarmsEvents = function (queries, dateFrom, dateTo, queryType) {
                    if (queries.length === 0) {
                        return Promise.resolve({ data: [] });
                    }
                    var requests = [];
                    if (queries.length === 0) {
                        return Promise.resolve({ data: [] });
                    }
                    for (var _i = 0, queries_2 = queries; _i < queries_2.length; _i++) {
                        var query = queries_2[_i];
                        var requestUrl = this.url + "/api/v1/datasources/" + query.datasourceId;
                        if (queryType == constants_1.QueryType.Alarms)
                            requestUrl = requestUrl + "/alarms/query";
                        else if (queryType == constants_1.QueryType.Events)
                            requestUrl = requestUrl + "/events/query";
                        var requestBody = {
                            timeFilter: {
                                from: dateFrom.toISOString(),
                                to: dateTo.toISOString(),
                                type: "Absolute"
                            },
                            variableFilter: {
                                variableNames: [
                                    "*"
                                ]
                            }
                        };
                        if (query.alarmEventsFilter !== undefined) {
                            requestBody.variableFilter.variableNames = [query.alarmEventsFilter.variableName || "*"];
                        }
                        if (query.alarmEventsFilter !== undefined && queryType == constants_1.QueryType.Alarms) {
                            var filterFlags = [];
                            if (query.alarmEventsFilter.onlyActive)
                                filterFlags.push("OnlyActive");
                            if (query.alarmEventsFilter.onlyCleared)
                                filterFlags.push("OnlyCleared");
                            if (query.alarmEventsFilter.onlyUnacknowledged)
                                filterFlags.push("OnlyUnacknowledged");
                            if (filterFlags.length > 0)
                                requestBody['filterFlags'] = filterFlags;
                        }
                        var request = this.backendSrv.datasourceRequest({
                            url: requestUrl,
                            data: requestBody,
                            method: 'POST'
                        });
                        requests.push(request);
                    }
                    var alarmEventResults = {
                        columns: [], rows: [], type: "table",
                    };
                    if (queryType == constants_1.QueryType.Alarms) {
                        alarmEventResults.columns = [
                            { text: "Received Time", type: "time", sort: true, desc: true },
                            { text: "Id" },
                            { text: "Variable Name" },
                            { text: "Value" },
                            { text: "Text" },
                            { text: "Comment" },
                            { text: "Cleared Time", type: "time" },
                            { text: "Acknowledged Time", type: "time" },
                            { text: "Computer" },
                            { text: "Acknowledged By" }
                        ];
                    }
                    else if (queryType == constants_1.QueryType.Events) {
                        alarmEventResults.columns = [
                            { text: "Received Time", type: "time", sort: true, desc: true },
                            { text: "Id" },
                            { text: "Variable Name" },
                            { text: "Value" },
                            { text: "Text" },
                            { text: "Comment" },
                            { text: "Computer" },
                            { text: "User name" }
                        ];
                    }
                    return Promise.all(requests).then(function (res) {
                        for (var _i = 0, res_2 = res; _i < res_2.length; _i++) {
                            var response = res_2[_i];
                            if (res === undefined || !('data' in response) ||
                                (queryType == constants_1.QueryType.Alarms && !('alarms' in response.data)) ||
                                (queryType == constants_1.QueryType.Events && !('events' in response.data))) {
                                throw { data: { message: 'Query Error: Retrieved data has invalid format' } };
                            }
                            var items = [];
                            if ('alarms' in response.data)
                                items = response.data.alarms;
                            else if ('events' in response.data)
                                items = response.data.events;
                            if (items.length == 0) {
                                continue;
                            }
                            var itemRows = items.map(function (a) {
                                switch (queryType) {
                                    case constants_1.QueryType.Alarms:
                                        return [
                                            Date.parse(a.receivedTime) || null,
                                            a.id || null,
                                            a.variableName || null,
                                            a.value || null,
                                            a.text || null,
                                            a.comment || null,
                                            Date.parse(a.clearedTime) || null,
                                            Date.parse(a.acknowledgedTime) || null,
                                            a.computer || null,
                                            a.username || a.userFullName || null
                                        ];
                                    case constants_1.QueryType.Events:
                                        return [
                                            Date.parse(a.receivedTime) || null,
                                            a.id || null,
                                            a.variableName || null,
                                            a.value || null,
                                            a.text || null,
                                            a.comment || null,
                                            a.computer || null,
                                            a.username || a.userFullName || null
                                        ];
                                }
                            });
                            if (itemRows.length > 0) {
                                alarmEventResults.rows = alarmEventResults.rows.concat(itemRows);
                            }
                        }
                        if (alarmEventResults.rows.length == 0) {
                            return Promise.resolve({ data: [] });
                        }
                        return Promise.resolve({ data: [alarmEventResults] });
                    }, this.handleHttpErrors).catch(this.handleQueryException);
                };
                ServiceGridDataSource.prototype.annotationQuery = function (options) {
                };
                ServiceGridDataSource.prototype.findDataSources = function (query) {
                    return this.backendSrv.datasourceRequest({
                        url: this.url + "/api/v1/datasources",
                        method: 'GET'
                    }).then(function (res) {
                        var datasources = [];
                        if (!("dataSources" in res.data)) {
                            throw { data: { message: "Query Error: Could not parse list of data sources" } };
                        }
                        var responseDataSources = res.data.dataSources;
                        if (responseDataSources === undefined || responseDataSources instanceof Array == false) {
                            throw { data: { message: "Query Error: Could not parse list of data sources" } };
                        }
                        for (var _i = 0, responseDataSources_1 = responseDataSources; _i < responseDataSources_1.length; _i++) {
                            var ds = responseDataSources_1[_i];
                            if (!('dataSourceId' in ds) || !('name' in ds)) {
                                throw { data: { message: "Query Error: Unknown/Invalid format" } };
                            }
                            var dsObj = { "text": ds.name, "value": ds.dataSourceId };
                            datasources.push(dsObj);
                        }
                        datasources.sort(function (a, b) { return (a.text > b.text) ? 1 : -1; });
                        return Promise.resolve(datasources);
                    }, function (err) {
                        return Promise.resolve([]);
                    });
                };
                ServiceGridDataSource.prototype.findArchives = function (datasourceId, query) {
                    return this.backendSrv.datasourceRequest({
                        url: this.url + "/api/v1/datasources/" + datasourceId + "/archives",
                        method: 'GET'
                    }).then(function (res) {
                        var archives = [];
                        if (!("archives" in res.data)) {
                            throw { data: { message: "Query Error: Could not parse list of archives" } };
                        }
                        var responseArchives = res.data.archives;
                        if (responseArchives === undefined || responseArchives instanceof Array == false) {
                            throw { data: { message: "Query Error: Could not parse list of archives" } };
                        }
                        var extractArchives = function (archiveArray, isAggregated) {
                            for (var _i = 0, archiveArray_1 = archiveArray; _i < archiveArray_1.length; _i++) {
                                var arch = archiveArray_1[_i];
                                if (!('identification' in arch) || !('name' in arch)) {
                                    throw { data: { message: "Query Error: Unknown/Invalid format" } };
                                }
                                var displayName = (isAggregated ? "- aggregated - " : "") + arch.name;
                                var archObj = { "text": displayName, "value": arch.identification };
                                archives.push(archObj);
                                if ('aggregatedArchives' in arch) {
                                    extractArchives(arch.aggregatedArchives, true);
                                }
                            }
                        };
                        extractArchives(responseArchives, false);
                        archives.sort(function (a, b) {
                            return (a.text.replace(/- aggregated - /, '') > b.text.replace(/- aggregated - /, '')) ? 1 : -1;
                        });
                        return Promise.resolve(archives);
                    }, function (err) {
                        return Promise.resolve([]);
                    });
                };
                ServiceGridDataSource.prototype.findVariablesForArchive = function (datasourceId, archiveId, query) {
                    return this.backendSrv.datasourceRequest({
                        url: this.url + "/api/v1/datasources/" + datasourceId + "/archives/" + archiveId,
                        method: 'GET'
                    }).then(function (res) {
                        if (!("variables" in res.data)) {
                            throw { data: { message: "Query Error: Could not parse list of variables" } };
                        }
                        var responseVariables = res.data.variables;
                        if (responseVariables === undefined || responseVariables instanceof Array == false) {
                            throw { data: { message: "Query Error: Could not parse list of variables" } };
                        }
                        var variables = responseVariables.map(function (item) {
                            return { text: item.variableName, value: item.variableName };
                        });
                        variables.sort(function (a, b) { return (a.text > b.text) ? 1 : -1; });
                        return Promise.resolve(variables);
                    }, function (err) {
                        return Promise.resolve([]);
                    });
                };
                ServiceGridDataSource.prototype.findVariables = function (datasourceId, query) {
                    var requestUrl = this.url + "/api/v1/datasources/" + datasourceId + "/variables/query";
                    var requestBody = { fields: ["name"], nameFilter: { variableNames: ["*"] } };
                    return this.backendSrv.datasourceRequest({
                        url: requestUrl,
                        data: requestBody,
                        method: 'POST'
                    }).then(function (res) {
                        if (!("variables" in res.data)) {
                            throw { data: { message: "Query Error: Could not parse list of variables" } };
                        }
                        var variables = res.data.variables.map(function (v) {
                            return { text: v.name, value: v.name };
                        });
                        variables.sort(function (a, b) { return (a.text > b.text) ? 1 : -1; });
                        return Promise.resolve(variables);
                    }, function (err) {
                        return Promise.resolve([]);
                    });
                };
                ServiceGridDataSource.prototype.testDatasource = function () {
                    return this.backendSrv.datasourceRequest({
                        url: this.url + "/",
                        method: 'GET'
                    }).then(function (data) {
                        return Promise.resolve({
                            status: 'success',
                            message: 'Connection test successful',
                        });
                    }, function (err) {
                        return Promise.resolve({
                            status: 'error',
                            message: 'Error: ' + err.status + ' ' + err.statusText,
                        });
                    });
                };
                ServiceGridDataSource.prototype.handleHttpErrors = function (err) {
                    if (err.status === 401) {
                        err.message = "Authorization Error: " + err.status + " Unauthorized";
                    }
                    return Promise.reject(err);
                };
                ServiceGridDataSource.prototype.handleQueryException = function (err) {
                    if (('data' in err) && err.data !== undefined) {
                        return Promise.reject(err);
                    }
                    return Promise.reject({ data: {
                            message: 'Query Error: Error during requesting data from API'
                        } });
                };
                return ServiceGridDataSource;
            }());
            exports_1("default", ServiceGridDataSource);
        }
    };
});
//# sourceMappingURL=datasource.js.map