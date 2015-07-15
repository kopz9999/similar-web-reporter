/**
 * @OnlyCurrentDoc  Limits the script to only accessing the current spreadsheet.
 */

var APP_TITLE = 'SimilarWeb Report Formatter';

/**
 * Models
 */

var Models = {}, Controllers = {};

// Models.Domain

Models.Domain = function(opts) {
  this.name = opts.name;
  this.domainReports = []
};

Models.Domain.prototype.addReport = function (report) {
  this.domainReports.push(report);
};

// Models.DomainReport

Models.DomainReport = function(opts) {
  this.concept = opts.concept;
  this.domainDatas = [];
};

Models.DomainReport.prototype.addDomainData = function (domainData) {
  this.domainDatas.push(domainData);
};

// Models.SimilarWebConcept

Models.SimilarWebConcept = function(opts) {
  this.name = opts.name;
  this.firstColumn = opts.firstColumn;
  this.lastColumn = opts.lastColumn;
};

// Models.DomainData

Models.DomainData = function(opts) {
  this.searchTerm = opts.searchTerm;
  this.visits = opts.visits;
};

// Models.FormData

Models.FormData = function(opts) {
  this.searchTermColumnValue = opts.searchTermColumnValue;
  this.visitsColumnValue = opts.visitsColumnValue;
  this.iterationBlocksValue = opts.iterationBlocksValue;
  this.resultsLocation = opts.resultsLocation;
  this.searchTermColumn = null;
  this.visitsColumn = null;
  this.iterationBlocks = null;
  this.init();
};

Models.FormData.prototype.init = function () {
  this.searchTermColumn = parseInt(this.searchTermColumnValue);
  this.visitsColumn = parseInt( this.visitsColumnValue );
  this.iterationBlocks = parseInt( this.iterationBlocksValue );
};

// Controllers.ReportFormatter

Controllers.ReportFormatter = function(opts) {
  this.spreadsheet = opts.spreadsheet;
  this.formData = opts.formData;
  this.domains = [];
  this.concepts = [];
  this.reportRows = null;
  this.reportColumns = null;
  this.init();
};

Controllers.ReportFormatter.prototype.init = function () {
  this.initReportRows();
  this.initReportColumns();
  this.initConcepts();
  this.fetchData();
  this.writeReports();
};

Controllers.ReportFormatter.prototype.writeReports = function () {
  var resultsRange = this.spreadsheet.getRange( this.formData.resultsLocation );
  var startRow = resultsRange.getRow();
  var startColumn = resultsRange.getColumn();
  var columnLimit = null;
  var domainPtr = null;
  var domainTitleRange = null;
  var domainReportPtr = null;
  var searchTermTitleRange = null;
  var visitsTitleRange = null;
  var searchTermTitle = null;
  var visitsTitle = null;
  var searchTermReportColumn = null;
  var visitsReportColumn = null;
  var reportOffset = 1 + ( this.concepts.length * 2 );
  var domainDataPtr = null;

  columnLimit = startColumn + this.domains.length;
  for (var i = 0, c = startColumn; i < this.domains.length; ++i, c+=reportOffset) {
    domainPtr = this.domains[ i ];
    domainTitleRange = this.spreadsheet.getRange( startRow, c );
    domainTitleRange.setValue( "Domains" );
    domainTitleRange.setFontWeight("bold");
    this.spreadsheet.getRange(startRow + 1, c).setValue( domainPtr.name );
    for (var j = 0, rc = c; j < domainPtr.domainReports.length; ++j, rc+=2) {
      domainReportPtr = domainPtr.domainReports[j];
      searchTermReportColumn = rc + 1;
      visitsReportColumn = rc + 2;
      searchTermTitleRange = this.spreadsheet
                              .getRange(startRow, searchTermReportColumn);
      visitsTitleRange = this.spreadsheet
                            .getRange(startRow, visitsReportColumn);

      searchTermTitle = domainReportPtr.concept.name + " : SearchTerm";
      searchTermTitleRange.setValue( searchTermTitle );
      searchTermTitleRange.setFontWeight("bold");

      visitsTitle = domainReportPtr.concept.name + " : Visits";
      visitsTitleRange.setValue( visitsTitle );
      visitsTitleRange.setFontWeight("bold");

      for (var k = 0, rr = null; k < domainReportPtr.domainDatas.length; ++k) {
        domainDataPtr = domainReportPtr.domainDatas[k];
        rr = startRow + k + 1;
        this.spreadsheet.getRange(rr, searchTermReportColumn)
          .setValue( domainDataPtr.searchTerm );
        this.spreadsheet.getRange(rr, visitsReportColumn)
          .setValue( domainDataPtr.visits );
      }

    }
  }

};

Controllers.ReportFormatter.prototype.fetchData = function () {
  var domainPtr = null;
  var domainReportPtr = null;
  var conceptPtr = null;
  var domainDataPtr = null;
  var searchTermValue = null;
  var visitsValue = null;
  var searchTermCurrentColumn = null;
  var visitsCurrentColumn = null;

  // Iterate rows
  for (var i = 2; i <= this.reportRows ; ++i ) {
    domainPtr = new Models.Domain({
      name: this.spreadsheet.getRange(i, 1).getValue()
    });
    this.domains.push( domainPtr );
    for (var j = 0; j < this.concepts.length; ++j) {
      conceptPtr = this.concepts[j]
      domainReportPtr = new Models.DomainReport({
        concept: conceptPtr
      });
      domainPtr.domainReports.push(domainReportPtr);
      for (var k = conceptPtr.firstColumn; k <= conceptPtr.lastColumn;
        k+= this.formData.iterationBlocks) {
          searchTermCurrentColumn = k + this.formData.searchTermColumn - 1;
          visitsCurrentColumn = k + this.formData.visitsColumn - 1;
          searchTermValue = this.spreadsheet.getRange(i,searchTermCurrentColumn)
                              .getValue();
          visitsValue = this.spreadsheet.getRange(i,visitsCurrentColumn)
                              .getValue();
          domainDataPtr = new Models.DomainData({
            searchTerm: searchTermValue,
            visits: visitsValue
          });
          domainReportPtr.domainDatas.push(domainDataPtr);
      }
    }
  }


};

Controllers.ReportFormatter.prototype.initConcepts = function () {
  var conceptName = this.getColumnConcept(1, 2);
  var i = 0;
  var conceptPtr = new Models.SimilarWebConcept({
    name: conceptName,
    firstColumn: 2
  });
  this.concepts.push( conceptPtr );
  for (i = 2; i <= this.reportColumns; i+= this.formData.iterationBlocks) {
    conceptName = this.getColumnConcept(1, i);
    if ( conceptName != conceptPtr.name ) {
      conceptPtr.lastColumn = i - 1;
      conceptPtr = new Models.SimilarWebConcept({
        name: conceptName,
        firstColumn: i
      });
      this.concepts.push(conceptPtr);
    }
  }
  conceptPtr.lastColumn = i - this.formData.iterationBlocks;
};

Controllers.ReportFormatter.prototype.getColumnConcept = function(row, column){
  var colValuePtr = this.spreadsheet.getRange(row, column)
                      .getValue().toString();
  return colValuePtr.split(":")[0].trim();
};

Controllers.ReportFormatter.prototype.initReportRows = function () {
  var rowValuePtr = null;
  var lastRow = this.spreadsheet.getLastRow();
  var i = 0;

  for ( i = 1; i <= lastRow ; ++i ) {
    rowValuePtr = this.spreadsheet.getRange(i, 1).getValue();
    if ( rowValuePtr.toString().trim() == "" ) {
      break;
    }
  }
  this.reportRows = i - 1;
};

Controllers.ReportFormatter.prototype.initReportColumns = function () {
  var colValuePtr = null;
  var lastColumn = this.spreadsheet.getLastColumn();
  var i = 0;

  for ( i = 1; i <= lastColumn ; ++i ) {
    colValuePtr = this.spreadsheet.getRange(1, i).getValue();
    if ( colValuePtr.toString().trim() == "" ) {
      break;
    }
  }
  this.reportColumns = i - 1;
};

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

function formatSimilarWebReport(formData) {
  var reportFormatter = new Controllers.ReportFormatter({
    spreadsheet: SpreadsheetApp.getActiveSheet(),
    formData: new Models.FormData(formData)
  });
}
