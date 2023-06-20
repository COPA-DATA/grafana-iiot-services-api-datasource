# 1.3.0

### Features / Enhancements
* Updated naming of *Service Grid* to *IIoT Services*
* Updated Grafana libraries to version 8.3.0


# 1.2.0

### Features / Enhancements
* Added possibility to directly request data from the Service Grid Data Storage via Service Grid API
* Service Grid version must be minimum version 10.2.2109.17002
* Added possibility to apply regex filter for template variables


# 1.1.1

### Features / Enhancements
* Added checkbox to also include temporary offline Datasources in query editor

### Bug Fixes
* Fixed case sensitive typo in archive data request payload


# 1.1.0

### Features / Enhancements
* Moved to Grafanas new React framework for plugins
* Added support for template variables
* Added a Online Values query type
* Variable selection now supports multiple values
* Removed the alias field, because renaming can now be handled through Grafanas overrides

### Bug Fixes
* Only datasource with status `online` will be shown


# 1.0.1

### Features / Enhancements
* Added possibility to set an alias for a variable query

### Bug Fixes
* Available data sources, archives and variables are now sorted by name in dropdown elements
* Aggregated archives are also shown in the list of available archives


# 1.0.0

### Features / Enhancements
* Initial Release of data source implementation

### Bug Fixes