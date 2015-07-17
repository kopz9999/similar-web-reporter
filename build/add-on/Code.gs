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
                this.urlTemplate = "http://api.similarweb.com/Site/{domain}/v1/{api}?" + "start={startDate}&end={endDate}&Format=JSON&" + "page={results}&UserKey={apiKey}";
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
                this.name = opts.name;
                this.domainDatas = [];
            }
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
        Processor.prototype.buildURL = function (api) {
            return this.setting.urlTemplate.replace(/\{domain\}/, this.formData.domain).replace(/\{api\}/, api).replace(/\{startDate\}/, this.formData.startDateValue).replace(/\{endDate\}/, this.formData.endDateValue).replace(/\{results\}/, this.formData.results.toString()).replace(/\{apiKey\}/, this.formData.apiKey);
        };
        Processor.prototype.processResponse = function (reportIdentity, response) {
            var data = JSON.parse(response);
            var report = new SimilarWebReporter.Models.Report({
                identity: reportIdentity,
                name: this.setting.lang[reportIdentity],
                processor: this
            });
            data["Data"].forEach(function (d) {
                report.domainDatas.push(new SimilarWebReporter.Models.DomainData({
                    concept: d['Site'] || d['SearchTerm'],
                    visits: d['Visits'],
                    change: d['Change']
                }));
            });
            this.reports.push(report);
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
                _self.storeReport(a);
            });
            this.processReports();
        };
        Processor.prototype.storeReport = function (api) {
            var url = this.buildURL(api);
            var response = UrlFetchApp.fetch(url);
            this.processResponse(api, response.getContentText());
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
