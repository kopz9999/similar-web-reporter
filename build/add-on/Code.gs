/**
 * @OnlyCurrentDoc  Limits the script to only accessing the current spreadsheet.
 */

var APP_TITLE = 'SimilarWeb Report Formatter';
var exports = {};

function onOpen(e) {
  SpreadsheetApp.getUi()
      .createAddonMenu()
      .addItem('Format SimilarWeb Report', 'showSidebar')
      .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  var ui = HtmlService.createTemplateFromFile('Sidebar')
      .evaluate()
      .setTitle(APP_TITLE);
  SpreadsheetApp.getUi().showSidebar(ui);
}

function createSimilarWebReport(params) {
  /*
  var formData = new SimilarWebReporter.Models.FormData({
    domain: "cnn.com", includePaidSearch: true,
    includeOrganicKeywords: false, includeReferrals: false,
    resultsValue: "10", startDateValue: "3-2015",
    endDateValue: "6-2015", apiKey: "1b7c88e11fa6f16c1129f6f4baa5c007",
    resultsLocation: "B1"
  });
  */
  var formData = new SimilarWebReporter.Models.FormData(params);
  var setting = new SimilarWebReporter.Models.Setting();
  var processor = new SimilarWebReporter.Processor({
    formData: formData,
    setting: setting,
    spreadsheet: SpreadsheetApp.getActiveSheet()
  });
  processor.processForm();
}

///<reference path='url-fetch-app.d.ts'/>
var SimilarWebReporter;
(function (SimilarWebReporter) {
    var Models;
    (function (Models) {
        // @DomainData
        var DomainData = (function () {
            function DomainData(opts) {
                this.concept = opts.concept;
                this.visits = opts.visits;
                this.change = opts.change;
            }
            DomainData.prototype.getMatrix = function () {
                return [this.concept, this.visits, this.change];
            };
            return DomainData;
        })();
        Models.DomainData = DomainData;
        // @FormData
        var FormData = (function () {
            function FormData(opts) {
                this.domain = opts.domain;
                this.includePaidSearch = opts.includePaidSearch;
                this.includeOrganicKeywords = opts.includeOrganicKeywords;
                this.includeReferrals = opts.includeReferrals;
                this.resultsValue = opts.resultsValue;
                this.startDateValue = opts.startDateValue;
                this.endDateValue = opts.endDateValue;
                this.apiKey = opts.apiKey;
                this.displayModeValue = opts.displayModeValue;
                this.resultsLocation = opts.resultsLocation;
                this.init();
            }
            FormData.prototype.init = function () {
                this.results = parseInt(this.resultsValue);
                this.displayMode = parseInt(this.displayModeValue);
            };
            return FormData;
        })();
        Models.FormData = FormData;
        // @Setting
        var Setting = (function () {
            function Setting() {
                this.pageSize = 10;
                this.urlTemplate = "http://api.similarweb.com/Site/{domain}/v1/{api}?" + "start={startDate}&end={endDate}&Format=JSON&" + "page={page}&UserKey={apiKey}";
                this.apis = {
                    referrals: 'referrals',
                    paidSearch: 'paidsearch',
                    organicSearch: 'orgsearch'
                };
                this.displayModes = {
                    horizontal: 0,
                    vertical: 1
                };
                this.lang = {
                    referrals: 'Referrals',
                    paidsearch: 'Paid Search',
                    orgsearch: 'Organic Search',
                    sites: 'Sites',
                    searchTerm: 'SearchTerm',
                    visits: 'Visits',
                    change: 'Change'
                };
            }
            return Setting;
        })();
        Models.Setting = Setting;
        // @Report
        var Report = (function () {
            function Report(opts) {
                this.identity = opts.identity;
                this.processor = opts.processor;
                this.name = this.processor.setting.lang[this.identity];
                this.iterations = null;
                this.reachableResults = null;
                this.domainDatas = [];
            }
            Report.prototype.requestData = function () {
                var objectResponse = this.getNextResponse(1);
                this.determineIterations(objectResponse['TotalCount']);
                this.consumeData(objectResponse["Data"]);
                for (var i = 2; i <= this.iterations; ++i) {
                    objectResponse = this.getNextResponse(i);
                    this.consumeData(objectResponse["Data"]);
                }
            };
            Report.prototype.getNextResponse = function (page) {
                var url = this.processor.buildURL(this.identity, page);
                var response = UrlFetchApp.fetch(url);
                var objectResponse = JSON.parse(response.getContentText());
                return objectResponse;
            };
            Report.prototype.consumeData = function (datas) {
                for (var i = 0, data = datas[0]; i < datas.length; data = datas[++i]) {
                    if (this.domainDatas.length >= this.reachableResults)
                        break;
                    this.domainDatas.push(new SimilarWebReporter.Models.DomainData({
                        concept: data['Site'] || data['SearchTerm'],
                        visits: data['Visits'],
                        change: data['Change']
                    }));
                }
            };
            Report.prototype.determineIterations = function (totalCount) {
                var results = this.processor.formData.results;
                var pageSize = this.processor.setting.pageSize;
                this.reachableResults = results > totalCount ? totalCount : results;
                this.iterations = Math.ceil(this.reachableResults / pageSize);
            };
            Report.prototype.getMatrix = function () {
                var matrix = [];
                var conceptHeader = null;
                var headers = null;
                if (this.identity == this.processor.setting.apis['referrals']) {
                    conceptHeader = this.processor.setting.lang['sites'];
                }
                else {
                    conceptHeader = this.processor.setting.lang['searchTerm'];
                }
                headers = [conceptHeader, this.name + " : " + this.processor.setting.lang['visits'], this.name + " : " + this.processor.setting.lang['change']];
                matrix.push(headers);
                this.domainDatas.forEach(function (dd) {
                    matrix.push(dd.getMatrix());
                });
                return matrix;
            };
            return Report;
        })();
        Models.Report = Report;
    })(Models = SimilarWebReporter.Models || (SimilarWebReporter.Models = {}));
    var Processor = (function () {
        function Processor(opts) {
            this.formData = opts.formData;
            this.setting = opts.setting;
            this.spreadsheet = opts.spreadsheet;
            this.reports = [];
        }
        Processor.prototype.buildURL = function (api, page) {
            return this.setting.urlTemplate.replace(/\{domain\}/, this.formData.domain).replace(/\{api\}/, api).replace(/\{startDate\}/, this.formData.startDateValue).replace(/\{endDate\}/, this.formData.endDateValue).replace(/\{page\}/, page.toString()).replace(/\{apiKey\}/, this.formData.apiKey);
        };
        Processor.prototype.processForm = function () {
            var _self = this;
            var apis = [];
            if (this.formData.includeReferrals) {
                apis.push(this.setting.apis['referrals']);
            }
            if (this.formData.includePaidSearch) {
                apis.push(this.setting.apis['paidSearch']);
            }
            if (this.formData.includeOrganicKeywords) {
                apis.push(this.setting.apis['organicSearch']);
            }
            apis.forEach(function (a) {
                _self.initReport(a);
            });
            this.processReports();
        };
        Processor.prototype.initReport = function (api) {
            var report = new SimilarWebReporter.Models.Report({
                identity: api,
                processor: this
            });
            report.requestData();
            this.reports.push(report);
        };
        Processor.prototype.processReports = function () {
            var resultsRange = this.spreadsheet.getRange(this.formData.resultsLocation);
            var row = resultsRange.getRow();
            var column = resultsRange.getColumn();
            var report = null;
            for (var i = 0; i < this.reports.length; ++i) {
                report = this.reports[i];
                this.writeReport(row, column, report);
                if (this.formData.displayMode == this.setting.displayModes['horizontal']) {
                    column += 4;
                }
                else {
                    row += report.domainDatas.length + 2;
                }
            }
        };
        Processor.prototype.writeReport = function (row, column, report) {
            var matrix = report.getMatrix();
            var range = this.spreadsheet.getRange(row, column, matrix.length, matrix[0].length);
            var headersRange = this.spreadsheet.getRange(row, column, 1, matrix[0].length);
            range.setValues(matrix);
            headersRange.setFontWeight("bold");
        };
        return Processor;
    })();
    SimilarWebReporter.Processor = Processor;
})(SimilarWebReporter = exports.SimilarWebReporter || (exports.SimilarWebReporter = {}));
