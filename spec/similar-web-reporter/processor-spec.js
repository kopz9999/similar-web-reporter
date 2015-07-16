require('typescript-require');

GLOBAL.SimilarWebReporter = require("../../lib/similar-web-reporter/processor.ts")
  .SimilarWebReporter;
var Helper = require("../support/test-helper.ts");
var fs = require("fs");

describe("SimilarWebReporter.Processor", function() {
  describe("buildURL", function(){
    it("creates expected url", function() {
      var formData = new SimilarWebReporter.Models.FormData({
        domain: "cnn.com", includePaidKeywords: true,
        includeOrganicKeywords: true, includeReferrals: true,
        resultsValue: "10", startDateValue: "6-2013",
        endDateValue: "5-2014", apiKey: "8743b52063cd84097a65d1633f5c74f5"
      });
      var setting = new SimilarWebReporter.Models.Setting();
      var processor = new SimilarWebReporter.Processor({
        formData: formData,
        setting: setting
      });
      expect(processor.buildURL('referrals'))
        .toEqual('http://api.similarweb.com/Site/cnn.com/v1/referrals?'+
          'start=6-2013&end=5-2014&Format=JSON&page=10&'+
          'UserKey=8743b52063cd84097a65d1633f5c74f5');
    });
  });
  describe("processResponse", function(){
    it("creates a valid report", function(){
      var buf = fs.readFileSync("./spec/fixtures/sample-response.json",
        "utf8");
      var setting = new SimilarWebReporter.Models.Setting();
      var processor = new SimilarWebReporter.Processor({
        formData: Helper.defaultFormData(),
        setting: setting
      });
      var report = null;
      processor.processResponse( 'referrals', buf );
      report = processor.reports[0];

      expect(report.identity).toEqual('referrals');
      expect(report.name).toEqual('Referrals');
      expect(report.domainDatas.length).toEqual(10);
    });
    it("creates a valid domain data", function(){
      var buf = fs.readFileSync("./spec/fixtures/sample-response.json",
        "utf8");
      var setting = new SimilarWebReporter.Models.Setting();
      var processor = new SimilarWebReporter.Processor({
        formData: Helper.defaultFormData(),
        setting: setting
      });
      var domainData = null;
      processor.processResponse( 'referrals', buf );
      domainData = processor.reports[0].domainDatas[0];

      expect(domainData.site).toEqual('drudgereport.com');
      expect(domainData.visits).toEqual(0.12102778215374196);
      expect(domainData.change).toEqual(0.20817320969507458);
    });
    it("creates a valid matrix", function(){
      var buf = fs.readFileSync("./spec/fixtures/sample-response.json",
        "utf8");
      var setting = new SimilarWebReporter.Models.Setting();
      var processor = new SimilarWebReporter.Processor({
        formData: Helper.defaultFormData(),
        setting: setting
      });
      var matrix = null;
      var domainMatrix = null;
      var headers = null;
      processor.processResponse( 'referrals', buf );
      matrix = processor.reports[0].getMatrix();
      headers = matrix[0];
      domainMatrix = matrix[1];
      expect(matrix.length).toEqual( 11 );
      expect(domainMatrix.length).toEqual( 3 );
      expect(headers[0]).toEqual('Domains');
      expect(headers[1]).toEqual('Referrals : Visits');
      expect(headers[2]).toEqual('Referrals : Change');
      expect(domainMatrix[0]).toEqual('drudgereport.com');
      expect(domainMatrix[1]).toEqual(0.12102778215374196);
      expect(domainMatrix[2]).toEqual(0.20817320969507458);
    });
  })

});
