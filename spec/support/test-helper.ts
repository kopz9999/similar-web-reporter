export function defaultFormData(){
  return new SimilarWebReporter.Models.FormData({
    domain: "cnn.com", includePaidKeywords: true, includeOrganicKeywords: true,
      includeReferrals: true, resultsValue: "10", startDateValue: "6-2013",
      endDateValue: "5-2014", apiKey: "8743b52063cd84097a65d1633f5c74f5",
      displayModeValue: "0"
  });
};
