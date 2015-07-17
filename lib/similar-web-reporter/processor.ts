///<reference path='url-fetch-app.d.ts'/>

export module SimilarWebReporter {
  export module Models {
    // @DomainData
    export class DomainData {
      concept: string;
      visits: number;
      change: number;
      constructor(opts: any) {
        this.concept = opts.concept;
        this.visits = opts.visits;
        this.change = opts.change;
      }
      getMatrix() {
        return [ this.concept, this.visits, this.change ];
      }
    }
    // @FormData
    export class FormData {
      domain: string;
      includePaidSearch: boolean;
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
      pageSize: number;
      constructor() {
        this.pageSize = 10;
        this.urlTemplate = "http://api.similarweb.com/Site/{domain}/v1/{api}?" +
          "start={startDate}&end={endDate}&Format=JSON&"+
          "page={page}&UserKey={apiKey}";
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
    }
    // @Report
    export class Report {
      identity: string;
      name: string;
      processor: SimilarWebReporter.Processor;
      iterations: number;
      reachableResults: number;
      domainDatas:Array<SimilarWebReporter.Models.DomainData>;
      constructor(opts) {
        this.identity = opts.identity;
        this.processor = opts.processor;
        this.name = this.processor.setting.lang[this.identity];
        this.iterations = null;
        this.reachableResults = null;
        this.domainDatas = [];
      }
      requestData() {
        var objectResponse = this.getNextResponse(1);
        this.determineIterations(objectResponse['TotalCount']);
        this.consumeData( objectResponse["Data"] );
        for ( var i = 2; i <= this.iterations; ++i ) {
          objectResponse = this.getNextResponse(i);
          this.consumeData( objectResponse["Data"] );
        }
      }
      getNextResponse(page:number) {
        var url = this.processor.buildURL(this.identity, page);
        var response = UrlFetchApp.fetch( url );
        var objectResponse = JSON.parse(response.getContentText());
        return objectResponse;
      }
      consumeData( datas ) {
        for (var i = 0, data = datas[0]; i < datas.length; data = datas[++i]) {
          if ( this.domainDatas.length >= this.reachableResults ) break;
          this.domainDatas.push(
            new SimilarWebReporter.Models.DomainData({
              concept: data['Site'] || data['SearchTerm'],
              visits: data['Visits'],
              change: data['Change']
            })
          );
        }
      }
      determineIterations(totalCount:number) {
        var results = this.processor.formData.results;
        var pageSize = this.processor.setting.pageSize;
        this.reachableResults = results > totalCount ? totalCount : results;
        this.iterations = Math.ceil( this.reachableResults / pageSize );
      }
      getMatrix() {
        var matrix = [];
        var conceptHeader = null;
        var headers = null;
        if (this.identity == this.processor.setting.apis['referrals']) {
          conceptHeader = this.processor.setting.lang['sites'];
        } else{
          conceptHeader = this.processor.setting.lang['searchTerm'];
        }
        headers = [ conceptHeader,
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
    private spreadsheet: any;
    private reports: Array<SimilarWebReporter.Models.Report>;
    setting: SimilarWebReporter.Models.Setting;
    formData: SimilarWebReporter.Models.FormData;
    constructor(opts: any) {
      this.formData = opts.formData;
      this.setting = opts.setting;
      this.spreadsheet = opts.spreadsheet;
      this.reports = [];
    }
    buildURL(api:string, page: number) {
      return this.setting.urlTemplate
        .replace(/\{domain\}/, this.formData.domain)
        .replace(/\{api\}/, api)
        .replace(/\{startDate\}/, this.formData.startDateValue)
        .replace(/\{endDate\}/, this.formData.endDateValue)
        .replace(/\{page\}/, page.toString())
        .replace(/\{apiKey\}/, this.formData.apiKey);
    }
    processForm(){
      var _self = this;
      var apis = [];
      if ( this.formData.includeReferrals ) {
        apis.push( this.setting.apis['referrals'] );
      }
      if ( this.formData.includePaidSearch ) {
        apis.push( this.setting.apis['paidSearch'] );
      }
      if ( this.formData.includeOrganicKeywords ) {
        apis.push( this.setting.apis['organicSearch'] );
      }
      apis.forEach( a => {
        _self.initReport(a);
      });
      this.processReports();
    }
    initReport(api:string) {
      var report = new SimilarWebReporter.Models.Report({
        identity: api,
        processor: this
      });
      report.requestData();
      this.reports.push( report );
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
      var headersRange = this.spreadsheet.getRange(row, column, 1,
        matrix[0].length );
      range.setValues(matrix);
      headersRange.setFontWeight("bold");
    }
  }
}
