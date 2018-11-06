'use strict';

let md5 = require('md5');

module.exports = function(AbnormalData) {
  let getYearAndMonth = function(context, user, next) {


    let months = ['01','02','03','04','05','06','07','08','09','10','11','12'];

    let args_data = context.args.data;
    // console.log(context.args.data);
    let method = context.methodString.split(".").pop();
    console.log(method);

    args_data.forEach(function(d, d_idx, arr) {
      // console.log(JSON.stringify(revisions, null, 2));
      let abnormalMonthSpan = [];

      let startDateObj = new Date(d.abnormalStartDate);
      let endDateObj = new Date(d.abnormalEndDate);
      let startYear = startDateObj.getFullYear();
      let startMonth = ('00' + (startDateObj.getMonth() + 1)).substr(-2);
      let startDay = ('00' + (startDateObj.getDate())).substr(-2);
      let startYearMonth = startYear + "-" + startMonth;
      
      let startDate = startYear + "/" + startMonth + "/" + startDay;
      
      let endYear = endDateObj.getFullYear();
      let endMonth = ('00' + (endDateObj.getMonth() + 1)).substr(-2);
      let endDay = ('00' + (endDateObj.getDate())).substr(-2);
      let endYearMonth = endYear + "-" + endMonth;
      
      let endDate = endYear + "/" + endMonth + "/" + endDay;
      
      console.log(startYearMonth);
      console.log(endYearMonth);
      for (let y = startYear; y <= endYear; y++) {
        for (let m_idx = 0; m_idx < 12; m_idx++) {
          let m = months[m_idx];
          let yearMonth = y + '-' + m;
          console.log([yearMonth]);
          if (yearMonth <= endYearMonth && yearMonth >= startYearMonth) {
            abnormalMonthSpan.push({'year': y, 'month': m_idx + 1});
          }
        }
      }
      arr[d_idx].abnormalMonthSpan = abnormalMonthSpan;
      arr[d_idx].abnormalStartDate = startDate;
      arr[d_idx].abnormalEndDate = endDate;
      arr[d_idx].abnormalId = md5(d.fullCameraLocationMd5 + ":" + startDate + ":" + endDate);

    });

    next();
  }

  AbnormalData.beforeRemote("bulkInsert", getYearAndMonth);
  AbnormalData.beforeRemote("bulkReplace", getYearAndMonth);
}