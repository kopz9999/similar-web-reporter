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
      expect(processor.buildURL('referrals', 1))
        .toEqual('http://api.similarweb.com/Site/cnn.com/v1/referrals?'+
          'start=6-2013&end=5-2014&Format=JSON&page=1&'+
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
      var report = new SimilarWebReporter.Models.Report({
        identity: 'referrals',
        processor: processor
      });
      var objectResponse = JSON.parse( buf );
      report.reachableResults = 7;
      report.consumeData( objectResponse['Data'] );
      expect(report.identity).toEqual('referrals');
      expect(report.name).toEqual('Referrals');
      expect(report.domainDatas.length).toEqual(7);
    });
    it("creates a valid domain data", function(){
      var buf = fs.readFileSync("./spec/fixtures/sample-response.json",
        "utf8");
      var setting = new SimilarWebReporter.Models.Setting();
      var processor = new SimilarWebReporter.Processor({
        formData: Helper.defaultFormData(),
        setting: setting
      });
      var report = new SimilarWebReporter.Models.Report({
        identity: 'referrals',
        processor: processor
      });
      var objectResponse = JSON.parse( buf );
      var domainData = null;
      report.reachableResults = 10;
      report.consumeData( objectResponse['Data'] );
      domainData = report.domainDatas[0];
      expect(domainData.concept).toEqual('drudgereport.com');
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
      var report = new SimilarWebReporter.Models.Report({
        identity: 'referrals',
        processor: processor
      });
      var objectResponse = JSON.parse( buf );
      var domainData = null;
      var matrix = null;
      var domainMatrix = null;
      var headers = null;

      report.reachableResults = 10;
      report.consumeData( objectResponse['Data'] );
      matrix = report.getMatrix();
      headers = matrix[0];
      domainMatrix = matrix[1];
      expect(matrix.length).toEqual( 11 );
      expect(domainMatrix.length).toEqual( 3 );
      expect(headers[0]).toEqual('Sites');
      expect(headers[1]).toEqual('Referrals : Visits');
      expect(headers[2]).toEqual('Referrals : Change');
      expect(domainMatrix[0]).toEqual('drudgereport.com');
      expect(domainMatrix[1]).toEqual(0.12102778215374196);
      expect(domainMatrix[2]).toEqual(0.20817320969507458);
    });

    it("determines iterations", function(){
      var setting = new SimilarWebReporter.Models.Setting();
      var formData = Helper.defaultFormData();
      formData.results = 24;
      var processor = new SimilarWebReporter.Processor({
        formData: formData,
        setting: setting
      });
      var report = new SimilarWebReporter.Models.Report({
        identity: 'referrals',
        processor: processor
      });

      report.determineIterations( 30 );
      expect(report.reachableResults).toEqual(24);
      expect(report.iterations).toEqual(3);

      report.determineIterations( 20 );
      expect(report.reachableResults).toEqual(20);
      expect(report.iterations).toEqual(2);
    });
  })

});
