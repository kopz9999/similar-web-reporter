///<reference path='url-fetch-app.d.ts'/>

export module SimilarWebReporter {
  export module Models {
    // @DomainData
    export class DomainData {
      site: string;
      visits: number;
      change: number;
      constructor(opts: any) {
        this.site = opts.site;
        this.visits = opts.visits;
        this.change = opts.change;
      }
      getMatrix() {
        return [ this.site, this.visits, this.change ];
      }
    }
    // @FormData
    export class FormData {
      domain: string;
      includePaidKeywords: boolean;
      includeOrganicKeywords: boolean;
      includeReferrals: boolean;
      resultsValue: string;
      startDateValue: string;
      endDateValue: string;
      apiKey: string;
      results: number;
      displayModeValue: string;
      displayMode: number;
      resultsLocation: string;
      constructor(opts: any) {
        this.domain = opts.domain;
        this.includePaidKeywords = opts.includePaidKeywords;
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
      init() {
        this.results = parseInt( this.resultsValue );
        this.displayMode = parseInt( this.displayModeValue );
      }
    }
    // @Setting
    export class Setting {
      urlTemplate: string;
      apis: Object;
      lang: Object;
      displayModes: Object;
      constructor() {
        this.urlTemplate = "http://api.similarweb.com/Site/{domain}/v1/{api}?" +
          "start={startDate}&end={endDate}&Format=JSON&"+
          "page={results}&UserKey={apiKey}";
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
          paidSearch: 'Paid Search',
          organicSearch: 'Organic Search',
          domains: 'Domains',
          visits: 'Visits',
          change: 'Change'
        };
      }
    }
    // @Report
    export class Report {
      identity: string;
      name: string;
      processor: SimilarWebReporter.Processor;
      domainDatas:Array<SimilarWebReporter.Models.DomainData>;
      constructor(opts) {
        this.identity = opts.identity;
        this.processor = opts.processor;
        this.name = opts.name;
        this.domainDatas = [];
      }
      getMatrix() {
        var matrix = [];
        var headers = [ this.processor.setting.lang['domains'],
          this.name + " : " + this.processor.setting.lang['visits'],
          this.name + " : " + this.processor.setting.lang['change'] ];
        matrix.push( headers );
        this.domainDatas.forEach( dd => {
          matrix.push( dd.getMatrix() );
        });
        return matrix;
      }
    }
  }


  export class Processor {
    private formData: SimilarWebReporter.Models.FormData;
    private spreadsheet: any;
    private reports: Array<SimilarWebReporter.Models.Report>;
    setting: SimilarWebReporter.Models.Setting;
    constructor(opts: any) {
      this.formData = opts.formData;
      this.setting = opts.setting;
      this.spreadsheet = opts.spreadsheet;
      this.reports = [];
    }
    buildURL(api:string) {
      return this.setting.urlTemplate
        .replace(/\{domain\}/, this.formData.domain)
        .replace(/\{api\}/, api)
        .replace(/\{startDate\}/, this.formData.startDateValue)
        .replace(/\{endDate\}/, this.formData.endDateValue)
        .replace(/\{results\}/, this.formData.results.toString())
        .replace(/\{apiKey\}/, this.formData.apiKey);
    }
    processResponse(reportIdentity: string,response: string) {
      var data = JSON.parse(response);
      var report = new SimilarWebReporter.Models.Report({
        identity: reportIdentity,
        name: this.setting.lang[reportIdentity],
        processor: this
      });
      data["Data"].forEach(d => {
        report.domainDatas.push(
          new SimilarWebReporter.Models.DomainData({
            site: d['Site'] || d['SearchTerm'],
            visits: d['Visits'],
            change: d['Change']
          })
        );
      });
      this.reports.push( report );
    }
    processForm(){
      var _self = this;
      var apis = [];
      if ( this.formData.includeReferrals ) {
        apis.push( this.setting.apis['referrals'] );
      }
      if ( this.formData.includePaidKeywords ) {
        apis.push( this.setting.apis['paidSearch'] );
      }
      if ( this.formData.includeOrganicKeywords ) {
        apis.push( this.setting.apis['organicSearch'] );
      }
      apis.forEach( a => {
        _self.storeReport(a);
      });
      this.processReports();
    }
    storeReport(api: string){
      var url = this.buildURL(api);
      var response = UrlFetchApp.fetch(url);
      this.processResponse( api, response.getContentText() );
    }
    processReports(){
      var resultsRange = this.spreadsheet
        .getRange( this.formData.resultsLocation );
      var row = resultsRange.getRow();
      var column = resultsRange.getColumn();
      var report = null;
      for (var i = 0; i < this.reports.length; ++i) {
        report = this.reports[i];
        this.writeReport( row, column, report );
        if (this.formData.displayMode ==
          this.setting.displayModes['horizontal']) {
          column += 4;
        } else {
          row += report.domainDatas.length + 2;
        }
      }
    }
    writeReport(row: number, column: number,
      report:SimilarWebReporter.Models.Report) {
      var matrix = report.getMatrix();
      var range = this.spreadsheet.getRange(row, column, matrix.length,
        matrix[0].length );
      var headersRange = this.spreadsheet.getRange(row, column, 0,
        matrix[0].length );
      range.setValues(matrix);
      headersRange.setFontWeight("bold");
    }
  }
}
